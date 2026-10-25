import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import type {
  IServerInstance,
  ICreateServerInput,
  ServerStatus,
  IServerStats,
  IPortMapping,
} from "../Types/ServerTypes.js";
import { ContainerManager } from "../Docker/ContainerManager.js";
import { LogStreamer } from "../Docker/LogStreamer.js";
import { StatsCollector } from "../Docker/StatsCollector.js";
import { TemplateService } from "./TemplateService.js";
import { VolumeService } from "./VolumeService.js";
import { BackupService } from "./BackupService.js";
import { DatabaseManager, type IAuditLogRecord } from "../Database/DatabaseManager.js";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";

export class ServerService {
  private static Instance: ServerService;
  private readonly ContainerManager: ContainerManager;
  private readonly LogStreamer: LogStreamer;
  private readonly StatsCollector: StatsCollector;
  private readonly TemplateService: TemplateService;
  private readonly VolumeService: VolumeService;
  private readonly BackupService: BackupService;
  private readonly DatabaseManager: DatabaseManager;
  private readonly DatabaseFilePath: string;
  private readonly Servers: Map<string, IServerInstance> = new Map();

  private constructor() {
    this.ContainerManager = new ContainerManager();
    this.LogStreamer = new LogStreamer();
    this.StatsCollector = new StatsCollector();
    this.TemplateService = TemplateService.GetInstance();
    this.VolumeService = new VolumeService();
    this.BackupService = BackupService.GetInstance();
    this.DatabaseManager = DatabaseManager.GetInstance();
    this.DatabaseFilePath = path.resolve(ConfigInstance.DataDirectory, "Servers.json");
  }

  public static GetInstance(): ServerService {
    if (!ServerService.Instance) {
      ServerService.Instance = new ServerService();
    }
    return ServerService.Instance;
  }

  public async Initialize(): Promise<void> {
    await this.VolumeService.Initialize();
    await this.LoadServers();
    await this.SyncAllServerStatuses();
    this.StartWatchdog();
  }

  private async LoadServers(): Promise<void> {
    try {
      const data = await fs.readFile(this.DatabaseFilePath, "utf8");
      const list = JSON.parse(data) as IServerInstance[];
      for (const server of list) {
        if (!server.WebhookToken) {
          server.WebhookToken = crypto.randomBytes(24).toString("hex");
        }
        if (!server.RestartPolicy) {
          server.RestartPolicy = "unless-stopped";
        }
        this.Servers.set(server.Id, server);
      }
    } catch {
      await this.SaveServers();
    }
  }

  private async SaveServers(): Promise<void> {
    const list = Array.from(this.Servers.values());
    await fs.mkdir(path.dirname(this.DatabaseFilePath), { recursive: true });
    await fs.writeFile(this.DatabaseFilePath, JSON.stringify(list, null, 2), "utf8");
  }

  public async SyncAllServerStatuses(): Promise<void> {
    for (const server of this.Servers.values()) {
      try {
        const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
        server.Image = inspect.Config.Image;
        server.OomKilled = Boolean(inspect.State.OOMKilled);
        server.ExitCode = typeof inspect.State.ExitCode === "number" ? inspect.State.ExitCode : 0;
        server.HealthStatus = (inspect.State.Health?.Status as "healthy" | "unhealthy" | "starting") || "none";
        if (inspect.HostConfig?.RestartPolicy?.Name) {
          server.RestartPolicy = inspect.HostConfig.RestartPolicy.Name as
            | "unless-stopped"
            | "always"
            | "on-failure"
            | "no";
        }
        if (inspect.State.Running) {
          server.Status = inspect.State.Paused ? "Paused" : "Running";
        } else if (inspect.State.Restarting) {
          server.Status = "Restarting";
        } else {
          server.Status = "Stopped";
        }
      } catch {
        server.Status = "Error";
      }
    }
    await this.SaveServers();
  }

  public async CreateServer(input: ICreateServerInput): Promise<IServerInstance> {
    const template = this.TemplateService.GetTemplate(input.TemplateId);
    if (!template) {
      throw new Error(`Template not found: ${input.TemplateId}`);
    }

    const serverId = crypto.randomUUID();
    const containerName = `qir-${input.Name.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-${serverId.slice(0, 8)}`;
    const volumePath = await this.VolumeService.EnsureServerVolume(serverId);

    await this.VolumeService.ProvisionInitialFiles(serverId, template.InitialFiles);

    const containerConfig = template.BuildContainerConfig(input, volumePath);
    const restartPolicy = input.RestartPolicy || "unless-stopped";
    containerConfig.RestartPolicy = { Name: restartPolicy };

    const container = await this.ContainerManager.CreateContainer(
      containerName,
      containerConfig
    );

    const serverInstance: IServerInstance = {
      Id: serverId,
      Name: input.Name,
      TemplateId: input.TemplateId,
      ContainerId: container.id,
      Status: "Created",
      CreatedAt: new Date().toISOString(),
      Ports: input.Ports && input.Ports.length > 0 ? input.Ports : template.DefaultPorts,
      EnvironmentVariables: input.EnvironmentVariables || {},
      Limits: input.Limits || {},
      AutoRestart: input.AutoRestart ?? true,
      RestartPolicy: restartPolicy,
      OomKilled: false,
      OwnerId: input.OwnerId,
      OwnerUsername: input.OwnerUsername,
      WebhookToken: input.WebhookToken || crypto.randomBytes(24).toString("hex"),
      AlertWebhookUrl: input.AlertWebhookUrl?.trim() || undefined,
      CrashCount: 0,
    };

    this.Servers.set(serverId, serverInstance);
    await this.SaveServers();

    return serverInstance;
  }

  public async StartServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.Status = "Starting";
    await this.SaveServers();

    try {
      await this.ContainerManager.StartContainer(server.ContainerId);
      server.Status = "Running";
    } catch (err) {
      server.Status = "Error";
      throw err;
    } finally {
      await this.SaveServers();
    }
  }

  public async StopServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.Status = "Stopping";
    await this.SaveServers();

    try {
      await this.ContainerManager.StopContainer(server.ContainerId, 10);
      server.Status = "Stopped";
    } catch (err) {
      server.Status = "Error";
      throw err;
    } finally {
      await this.SaveServers();
    }
  }

  public async KillServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.Status = "Stopping";
    await this.SaveServers();

    try {
      await this.ContainerManager.StopContainer(server.ContainerId, 0);
      server.Status = "Stopped";
    } catch (err) {
      server.Status = "Error";
      throw err;
    } finally {
      await this.SaveServers();
    }
  }

  public async RestartServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.Status = "Restarting";
    await this.SaveServers();

    try {
      await this.ContainerManager.RestartContainer(server.ContainerId, 10);
      server.Status = "Running";
    } catch (err) {
      server.Status = "Error";
      throw err;
    } finally {
      await this.SaveServers();
    }
  }

  public async DeleteServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      await this.ContainerManager.StopContainer(server.ContainerId, 2);
    } catch {}

    try {
      await this.ContainerManager.RemoveContainer(server.ContainerId, true);
    } catch {}

    await this.VolumeService.DeleteServerVolume(serverId);
    this.Servers.delete(serverId);
    await this.SaveServers();

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SERVER_DELETE",
      IpAddress: "system",
      Details: `Server ${server.Name} (${serverId}) deleted.`,
    });
  }

  public async GetServer(serverId: string): Promise<IServerInstance | undefined> {
    const server = this.Servers.get(serverId);
    if (!server) {
      return undefined;
    }

    try {
      const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
      server.Image = inspect.Config.Image;
      server.OomKilled = Boolean(inspect.State.OOMKilled);
      server.ExitCode = typeof inspect.State.ExitCode === "number" ? inspect.State.ExitCode : 0;
      server.HealthStatus = (inspect.State.Health?.Status as "healthy" | "unhealthy" | "starting") || "none";
      if (inspect.HostConfig?.RestartPolicy?.Name) {
        server.RestartPolicy = inspect.HostConfig.RestartPolicy.Name as
          | "unless-stopped"
          | "always"
          | "on-failure"
          | "no";
      }
      server.Status = inspect.State.Running
        ? (inspect.State.Paused ? "Paused" : "Running")
        : inspect.State.Restarting
        ? "Restarting"
        : "Stopped";
    } catch {
      server.Status = "Error";
    }

    return server;
  }

  public async GetAllServers(): Promise<IServerInstance[]> {
    await this.SyncAllServerStatuses();
    return Array.from(this.Servers.values());
  }

  public async GetServersByOwner(ownerId: string): Promise<IServerInstance[]> {
    await this.SyncAllServerStatuses();
    return Array.from(this.Servers.values()).filter((s) => s.OwnerId === ownerId);
  }

  public async SendCommand(serverId: string, command: string): Promise<string> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const result = await this.ContainerManager.ExecuteCommand(server.ContainerId, [
      "sh",
      "-c",
      command,
    ]);

    return result.Output;
  }

  public async GetLogs(serverId: string, tailLines: number = 100): Promise<string> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return await this.LogStreamer.GetRecentLogs(server.ContainerId, tailLines);
  }

  public async StreamLogs(
    serverId: string,
    callback: (log: string) => void
  ): Promise<() => void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return await this.LogStreamer.StreamLogs(server.ContainerId, callback);
  }

  public async StreamStats(
    serverId: string,
    callback: (stats: IServerStats) => void
  ): Promise<() => void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return await this.StatsCollector.StreamStats(serverId, server.ContainerId, callback);
  }

  public async InspectServer(serverId: string): Promise<unknown> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return await this.ContainerManager.InspectContainer(server.ContainerId);
  }

  public async UpdateServerConfig(
    serverId: string,
    updates: {
      EnvironmentVariables?: Record<string, string>;
      AutoRestart?: boolean;
      RestartPolicy?: "unless-stopped" | "always" | "on-failure" | "no";
      Limits?: { Memory?: number; CpuShares?: number };
    }
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    if (updates.EnvironmentVariables) {
      server.EnvironmentVariables = updates.EnvironmentVariables;
      try {
        const newContainerId = await this.ContainerManager.RecreateContainerWithNewEnv(
          server.ContainerId,
          updates.EnvironmentVariables
        );
        server.ContainerId = newContainerId;
      } catch {}
    }
    if (updates.AutoRestart !== undefined) {
      server.AutoRestart = updates.AutoRestart;
    }
    if (updates.RestartPolicy) {
      server.RestartPolicy = updates.RestartPolicy;
      try {
        await this.ContainerManager.UpdateContainerLimits(
          server.ContainerId,
          undefined,
          undefined,
          updates.RestartPolicy
        );
      } catch {}
    }
    if (updates.Limits) {
      server.Limits = updates.Limits;
      if (server.Status === "Running") {
        try {
          await this.ContainerManager.UpdateContainerLimits(
            server.ContainerId,
            updates.Limits.Memory,
            updates.Limits.CpuShares ? updates.Limits.CpuShares * 1e7 : undefined,
            server.RestartPolicy
          );
        } catch {}
      }
    }
    await this.SaveServers();
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SERVER_CONFIG_UPDATE",
      IpAddress: "system",
      Details: `Server ${server.Name} (${serverId}) configuration updated.`,
    });
    return server;
  }

  public async UpdateEnvironmentVariables(
    serverId: string,
    env: Record<string, string>
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.EnvironmentVariables = env;
    const newContainerId = await this.ContainerManager.RecreateContainerWithNewEnv(
      server.ContainerId,
      env
    );
    server.ContainerId = newContainerId;
    await this.SaveServers();

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "ENV_UPDATE",
      IpAddress: "system",
      Details: `Updated environment variables for server ${server.Name}`,
    });

    return server;
  }

  public async UpdateRestartPolicy(
    serverId: string,
    policy: "unless-stopped" | "always" | "on-failure" | "no"
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.RestartPolicy = policy;
    await this.ContainerManager.UpdateContainerLimits(
      server.ContainerId,
      undefined,
      undefined,
      policy
    );
    await this.SaveServers();

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "RESTART_POLICY_UPDATE",
      IpAddress: "system",
      Details: `Updated restart policy to ${policy} for server ${server.Name}`,
    });

    return server;
  }

  public GetVolumeService(): VolumeService {
    return this.VolumeService;
  }

  public GetBackupService(): BackupService {
    return this.BackupService;
  }

  public GetServerAuditLogs(serverId: string): IAuditLogRecord[] {
    return this.DatabaseManager.GetAuditLogsForServer(serverId);
  }

  public async AddServerPort(serverId: string, port: IPortMapping): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const exists = server.Ports.some(
      (p) => p.ContainerPort === port.ContainerPort && p.Protocol === port.Protocol
    );
    if (exists) {
      throw new Error(`Port ${port.ContainerPort}/${port.Protocol} is already mapped`);
    }

    const updatedPorts = [...server.Ports, port];
    const newContainerId = await this.ContainerManager.RecreateContainerWithNewPorts(
      server.ContainerId,
      updatedPorts
    );

    server.ContainerId = newContainerId;
    server.Ports = updatedPorts;
    await this.SaveServers();

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "PORT_ADD",
      IpAddress: "system",
      Details: `Added port mapping ${port.HostPort}->${port.ContainerPort}/${port.Protocol} for server ${server.Name}`,
    });

    return server;
  }

  public async RemoveServerPort(
    serverId: string,
    containerPort: number,
    protocol: string
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const updatedPorts = server.Ports.filter(
      (p) => !(p.ContainerPort === containerPort && p.Protocol === protocol)
    );
    if (updatedPorts.length === server.Ports.length) {
      throw new Error(`Port mapping ${containerPort}/${protocol} not found`);
    }

    const newContainerId = await this.ContainerManager.RecreateContainerWithNewPorts(
      server.ContainerId,
      updatedPorts
    );

    server.ContainerId = newContainerId;
    server.Ports = updatedPorts;
    await this.SaveServers();

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "PORT_REMOVE",
      IpAddress: "system",
      Details: `Removed port mapping ${containerPort}/${protocol} for server ${server.Name}`,
    });

    return server;
  }

  public async CloneServer(sourceServerId: string, newName: string): Promise<IServerInstance> {
    const source = this.Servers.get(sourceServerId);
    if (!source) {
      throw new Error(`Source server ${sourceServerId} not found`);
    }

    const template = this.TemplateService.GetTemplate(source.TemplateId);
    if (!template) {
      throw new Error(`Template not found: ${source.TemplateId}`);
    }

    const allAllocatedHostPorts = new Set<number>();
    for (const s of this.Servers.values()) {
      for (const p of s.Ports) {
        allAllocatedHostPorts.add(p.HostPort);
      }
    }

    const clonedPorts: IPortMapping[] = source.Ports.map((p) => {
      let candidatePort = p.HostPort + 10;
      while (allAllocatedHostPorts.has(candidatePort)) {
        candidatePort++;
      }
      allAllocatedHostPorts.add(candidatePort);
      return {
        HostPort: candidatePort,
        ContainerPort: p.ContainerPort,
        Protocol: p.Protocol,
      };
    });

    const newServer = await this.CreateServer({
      Name: newName,
      TemplateId: source.TemplateId,
      Ports: clonedPorts,
      EnvironmentVariables: { ...source.EnvironmentVariables },
      Limits: { ...source.Limits },
      AutoRestart: source.AutoRestart,
      RestartPolicy: source.RestartPolicy,
      OwnerId: source.OwnerId,
      OwnerUsername: source.OwnerUsername,
    });

    try {
      const sourceVolPath = this.VolumeService.GetServerVolumePath(sourceServerId);
      const targetVolPath = this.VolumeService.GetServerVolumePath(newServer.Id);
      await fs.cp(sourceVolPath, targetVolPath, { recursive: true });
    } catch {}

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SERVER_CLONE",
      IpAddress: "system",
      Details: `Cloned server "${source.Name}" to "${newName}" (${newServer.Id})`,
    });

    return newServer;
  }

  public RotateWebhookToken(serverId: string): string {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    server.WebhookToken = crypto.randomBytes(24).toString("hex");
    this.SaveServers().catch(() => {});
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "WEBHOOK_ROTATE",
      IpAddress: "system",
      Details: `Rotated deploy webhook token for server ${server.Name}`,
    });
    return server.WebhookToken;
  }

  public async TriggerWebhook(serverId: string, token: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error("Server not found");
    }
    if (!server.WebhookToken || server.WebhookToken !== token) {
      throw new Error("Invalid webhook authorization token");
    }

    await this.RestartServer(serverId);
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "WEBHOOK_TRIGGER",
      IpAddress: "webhook",
      Details: `Deploy webhook successfully triggered restart for server ${server.Name}`,
    });
  }

  public async BulkStartAll(): Promise<{ SuccessCount: number; TotalCount: number }> {
    const all = Array.from(this.Servers.values());
    let successCount = 0;
    for (const server of all) {
      if (server.Status !== "Running") {
        try {
          await this.StartServer(server.Id);
          successCount++;
        } catch {}
      }
    }
    return { SuccessCount: successCount, TotalCount: all.length };
  }

  public async BulkStopAll(): Promise<{ SuccessCount: number; TotalCount: number }> {
    const all = Array.from(this.Servers.values());
    let successCount = 0;
    for (const server of all) {
      if (server.Status === "Running") {
        try {
          await this.StopServer(server.Id);
          successCount++;
        } catch {}
      }
    }
    return { SuccessCount: successCount, TotalCount: all.length };
  }

  public async BulkRestartAll(): Promise<{ SuccessCount: number; TotalCount: number }> {
    const all = Array.from(this.Servers.values());
    let successCount = 0;
    for (const server of all) {
      if (server.Status === "Running") {
        try {
          await this.RestartServer(server.Id);
          successCount++;
        } catch {}
      }
    }
    return { SuccessCount: successCount, TotalCount: all.length };
  }

  public async DispatchAlertWebhook(
    server: IServerInstance,
    title: string,
    description: string,
    severity: "info" | "warning" | "danger" | "success" = "info"
  ): Promise<void> {
    if (!server.AlertWebhookUrl) return;
    const colorMap = {
      info: 3447003,
      warning: 16776960,
      danger: 15158332,
      success: 3066993,
    };
    try {
      const isDiscord =
        server.AlertWebhookUrl.includes("discord.com") ||
        server.AlertWebhookUrl.includes("discordapp.com");
      const body = isDiscord
        ? {
            username: "QiR Panel",
            embeds: [
              {
                title: `[${severity.toUpperCase()}] ${server.Name}: ${title}`,
                description,
                color: colorMap[severity],
                timestamp: new Date().toISOString(),
                footer: { text: "QiR Container Watchdog" },
              },
            ],
          }
        : {
            text: `[QiR Alert - ${severity.toUpperCase()}] ${server.Name}: ${title}\n${description}`,
            serverId: server.Id,
            serverName: server.Name,
            severity,
            timestamp: new Date().toISOString(),
          };

      await fetch(server.AlertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {}
  }

  public async RunWatchdogCycle(): Promise<void> {
    for (const server of this.Servers.values()) {
      try {
        const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
        const previousStatus = server.Status;
        server.OomKilled = Boolean(inspect.State.OOMKilled);
        server.HealthStatus = (inspect.State.Health?.Status as "healthy" | "unhealthy" | "starting") || "none";

        if (inspect.State.Running) {
          server.Status = "Running";
        } else if (inspect.State.Restarting) {
          server.Status = "Restarting";
        } else {
          server.Status = "Stopped";
        }

        if (previousStatus === "Running" && !inspect.State.Running && inspect.State.ExitCode !== 0) {
          server.CrashCount = (server.CrashCount || 0) + 1;
          server.LastCrashTime = new Date().toISOString();
          const reason = inspect.State.OOMKilled
            ? "Out Of Memory (OOM Killer)"
            : `Exit code ${inspect.State.ExitCode}`;
          this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "SERVER_CRASH_DETECTED",
            IpAddress: "127.0.0.1",
            Details: `Server "${server.Name}" crashed: ${reason} (ID: ${server.Id})`,
          });
          await this.DispatchAlertWebhook(
            server,
            "Container Crashed Unexpectedly",
            `Server "${server.Name}" exited with code ${inspect.State.ExitCode}. Reason: ${reason}. Total recorded crashes: ${server.CrashCount}.`,
            "danger"
          );
        }
      } catch {}
    }
    await this.SaveServers();
  }

  public StartWatchdog(intervalMs: number = 15000): void {
    setInterval(() => {
      this.RunWatchdogCycle().catch(() => {});
    }, intervalMs);
  }

  public async UpdateAlertWebhook(
    serverId: string,
    alertWebhookUrl?: string
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    server.AlertWebhookUrl = alertWebhookUrl?.trim() || undefined;
    await this.SaveServers();
    return server;
  }

  public async TestAlertWebhook(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    if (!server.AlertWebhookUrl) {
      throw new Error("No alert webhook configured for this server");
    }
    await this.DispatchAlertWebhook(
      server,
      "Test Notification",
      `Test alert triggered from QiR Control Panel for server "${server.Name}". Webhook communication is fully operational.`,
      "info"
    );
  }

  public async ExportVolumeArchive(serverId: string): Promise<{ FilePath: string; FileName: string }> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    const safeName = server.Name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const backup = await this.BackupService.CreateBackup(serverId, `${safeName}_export`);
    const filePath = this.BackupService.GetBackupFilePath(serverId, backup.FileName);
    return { FilePath: filePath, FileName: backup.FileName };
  }

  public async GetServerProcesses(
    serverId: string
  ): Promise<{ Titles: string[]; Processes: string[][] }> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return await this.ContainerManager.GetContainerProcesses(server.ContainerId);
  }

  public async RedeployServer(
    serverId: string,
    newImage?: string
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    const targetImage = (newImage && newImage.trim()) || server.Image;
    if (!targetImage) {
      throw new Error("No image defined for container rollout");
    }

    const newContainerId = await this.ContainerManager.RecreateContainerWithNewImage(
      server.ContainerId,
      targetImage
    );
    server.ContainerId = newContainerId;
    server.Image = targetImage;
    server.Status = "Running";
    await this.SaveServers();

    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SERVER_REDEPLOY",
      IpAddress: "system",
      Details: `Server ${server.Name} (${serverId}) redeployed with image ${targetImage}.`,
    });

    return server;
  }

  public async PauseServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    await this.ContainerManager.PauseContainer(server.ContainerId);
    server.Status = "Paused";
    await this.SaveServers();
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SERVER_PAUSE",
      IpAddress: "system",
      Details: `Paused container execution for "${server.Name}" (${serverId})`,
    });
  }

  public async UnpauseServer(serverId: string): Promise<void> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    await this.ContainerManager.UnpauseContainer(server.ContainerId);
    server.Status = "Running";
    await this.SaveServers();
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SERVER_UNPAUSE",
      IpAddress: "system",
      Details: `Unpaused container execution for "${server.Name}" (${serverId})`,
    });
  }

  public async ProbePort(
    serverId: string,
    port: number,
    host: string = "127.0.0.1"
  ): Promise<{ Reachable: boolean; LatencyMs: number | null; Error?: string }> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    const isMapped = server.Ports.some((p) => p.HostPort === port);
    if (!isMapped) {
      throw new Error(`Port ${port} is not mapped to server ${serverId}`);
    }

    return new Promise((resolve) => {
      const startTime = performance.now();
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.on("connect", () => {
        const latencyMs = Math.round(performance.now() - startTime);
        socket.destroy();
        resolve({ Reachable: true, LatencyMs: latencyMs });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ Reachable: false, LatencyMs: null, Error: "Connection timed out (2.5s)" });
      });

      socket.on("error", (err: Error) => {
        socket.destroy();
        resolve({ Reachable: false, LatencyMs: null, Error: err.message });
      });

      socket.connect(port, host);
    });
  }
}
