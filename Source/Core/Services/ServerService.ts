import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type {
  IServerInstance,
  ICreateServerInput,
  ServerStatus,
  IServerStats,
} from "../Types/ServerTypes.js";
import { ContainerManager } from "../Docker/ContainerManager.js";
import { LogStreamer } from "../Docker/LogStreamer.js";
import { StatsCollector } from "../Docker/StatsCollector.js";
import { TemplateService } from "./TemplateService.js";
import { VolumeService } from "./VolumeService.js";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";

export class ServerService {
  private static Instance: ServerService;
  private readonly ContainerManager: ContainerManager;
  private readonly LogStreamer: LogStreamer;
  private readonly StatsCollector: StatsCollector;
  private readonly TemplateService: TemplateService;
  private readonly VolumeService: VolumeService;
  private readonly DatabaseFilePath: string;
  private readonly Servers: Map<string, IServerInstance> = new Map();

  private constructor() {
    this.ContainerManager = new ContainerManager();
    this.LogStreamer = new LogStreamer();
    this.StatsCollector = new StatsCollector();
    this.TemplateService = TemplateService.GetInstance();
    this.VolumeService = new VolumeService();
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
  }

  private async LoadServers(): Promise<void> {
    try {
      const data = await fs.readFile(this.DatabaseFilePath, "utf8");
      const list = JSON.parse(data) as IServerInstance[];
      for (const server of list) {
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
        if (inspect.State.Running) {
          server.Status = "Running";
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
      OwnerId: input.OwnerId,
      OwnerUsername: input.OwnerUsername,
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
      await this.ContainerManager.RestartContainer(server.ContainerId);
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
      await this.ContainerManager.RemoveContainer(server.ContainerId, true);
    } catch {}

    await this.VolumeService.DeleteServerVolume(serverId);
    this.Servers.delete(serverId);
    await this.SaveServers();
  }

  public async GetServer(serverId: string): Promise<IServerInstance | undefined> {
    const server = this.Servers.get(serverId);
    if (!server) {
      return undefined;
    }

    try {
      const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
      server.Status = inspect.State.Running
        ? "Running"
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
    updates: { EnvironmentVariables?: Record<string, string>; AutoRestart?: boolean }
  ): Promise<IServerInstance> {
    const server = this.Servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    if (updates.EnvironmentVariables) {
      server.EnvironmentVariables = updates.EnvironmentVariables;
    }
    if (updates.AutoRestart !== undefined) {
      server.AutoRestart = updates.AutoRestart;
    }
    await this.SaveServers();
    return server;
  }

  public GetVolumeService(): VolumeService {
    return this.VolumeService;
  }
}
