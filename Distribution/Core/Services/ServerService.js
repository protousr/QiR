import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import { ContainerManager } from "../Docker/ContainerManager.js";
import { LogStreamer } from "../Docker/LogStreamer.js";
import { StatsCollector } from "../Docker/StatsCollector.js";
import { TemplateService } from "./TemplateService.js";
import { VolumeService } from "./VolumeService.js";
import { BackupService } from "./BackupService.js";
import { DatabaseManager } from "../Database/DatabaseManager.js";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
export class ServerService {
    static Instance;
    ContainerManager;
    LogStreamer;
    StatsCollector;
    TemplateService;
    VolumeService;
    BackupService;
    DatabaseManager;
    DatabaseFilePath;
    Servers = new Map();
    constructor() {
        this.ContainerManager = new ContainerManager();
        this.LogStreamer = new LogStreamer();
        this.StatsCollector = new StatsCollector();
        this.TemplateService = TemplateService.GetInstance();
        this.VolumeService = new VolumeService();
        this.BackupService = BackupService.GetInstance();
        this.DatabaseManager = DatabaseManager.GetInstance();
        this.DatabaseFilePath = path.resolve(ConfigInstance.DataDirectory, "Servers.json");
    }
    static GetInstance() {
        if (!ServerService.Instance) {
            ServerService.Instance = new ServerService();
        }
        return ServerService.Instance;
    }
    async Initialize() {
        await this.VolumeService.Initialize();
        await this.LoadServers();
        await this.SyncAllServerStatuses();
        this.StartWatchdog();
    }
    async LoadServers() {
        try {
            const data = await fs.readFile(this.DatabaseFilePath, "utf8");
            const list = JSON.parse(data);
            for (const server of list) {
                if (!server.WebhookToken) {
                    server.WebhookToken = crypto.randomBytes(24).toString("hex");
                }
                if (!server.RestartPolicy) {
                    server.RestartPolicy = "unless-stopped";
                }
                this.Servers.set(server.Id, server);
            }
        }
        catch {
            await this.SaveServers();
        }
    }
    async SaveServers() {
        const list = Array.from(this.Servers.values());
        await fs.mkdir(path.dirname(this.DatabaseFilePath), { recursive: true });
        await fs.writeFile(this.DatabaseFilePath, JSON.stringify(list, null, 2), "utf8");
    }
    async SyncAllServerStatuses() {
        for (const server of this.Servers.values()) {
            try {
                const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
                server.Image = inspect.Config.Image;
                server.OomKilled = Boolean(inspect.State.OOMKilled);
                server.ExitCode = typeof inspect.State.ExitCode === "number" ? inspect.State.ExitCode : 0;
                server.RestartCount = inspect.RestartCount ?? 0;
                server.FinishedAt = inspect.State?.FinishedAt || "";
                server.HealthStatus = inspect.State.Health?.Status || "none";
                if (inspect.State.Health?.Log) {
                    server.HealthLogs = inspect.State.Health.Log
                        .slice(-5)
                        .map((l) => ({
                        Start: l.Start || "",
                        End: l.End || "",
                        ExitCode: l.ExitCode ?? 0,
                        Output: l.Output || "",
                    }));
                }
                if (inspect.HostConfig?.RestartPolicy?.Name) {
                    server.RestartPolicy = inspect.HostConfig.RestartPolicy.Name;
                }
                if (inspect.State.Running) {
                    server.Status = inspect.State.Paused ? "Paused" : "Running";
                }
                else if (inspect.State.Restarting) {
                    server.Status = "Restarting";
                }
                else {
                    server.Status = "Stopped";
                }
            }
            catch {
                server.Status = "Error";
            }
        }
        await this.SaveServers();
    }
    async CreateServer(input) {
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
        const container = await this.ContainerManager.CreateContainer(containerName, containerConfig);
        const serverInstance = {
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
            Tags: input.Tags || [],
        };
        this.Servers.set(serverId, serverInstance);
        await this.SaveServers();
        return serverInstance;
    }
    async StartServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.Status = "Starting";
        await this.SaveServers();
        try {
            await this.ContainerManager.StartContainer(server.ContainerId);
            server.Status = "Running";
        }
        catch (err) {
            server.Status = "Error";
            throw err;
        }
        finally {
            await this.SaveServers();
        }
    }
    async StopServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.Status = "Stopping";
        await this.SaveServers();
        try {
            await this.ContainerManager.StopContainer(server.ContainerId, 10);
            server.Status = "Stopped";
        }
        catch (err) {
            server.Status = "Error";
            throw err;
        }
        finally {
            await this.SaveServers();
        }
    }
    async KillServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.Status = "Stopping";
        await this.SaveServers();
        try {
            await this.ContainerManager.StopContainer(server.ContainerId, 0);
            server.Status = "Stopped";
        }
        catch (err) {
            server.Status = "Error";
            throw err;
        }
        finally {
            await this.SaveServers();
        }
    }
    async RestartServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.Status = "Restarting";
        await this.SaveServers();
        try {
            await this.ContainerManager.RestartContainer(server.ContainerId, 10);
            server.Status = "Running";
        }
        catch (err) {
            server.Status = "Error";
            throw err;
        }
        finally {
            await this.SaveServers();
        }
    }
    async DeleteServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        try {
            await this.ContainerManager.StopContainer(server.ContainerId, 2);
        }
        catch { }
        try {
            await this.ContainerManager.RemoveContainer(server.ContainerId, true);
        }
        catch { }
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
    async GetServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            return undefined;
        }
        try {
            const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
            server.Image = inspect.Config.Image;
            server.OomKilled = Boolean(inspect.State.OOMKilled);
            server.ExitCode = typeof inspect.State.ExitCode === "number" ? inspect.State.ExitCode : 0;
            server.RestartCount = inspect.RestartCount ?? 0;
            server.FinishedAt = inspect.State?.FinishedAt || "";
            server.HealthStatus = inspect.State.Health?.Status || "none";
            if (inspect.HostConfig?.RestartPolicy?.Name) {
                server.RestartPolicy = inspect.HostConfig.RestartPolicy.Name;
            }
            server.Status = inspect.State.Running
                ? (inspect.State.Paused ? "Paused" : "Running")
                : inspect.State.Restarting
                    ? "Restarting"
                    : "Stopped";
        }
        catch {
            server.Status = "Error";
        }
        return server;
    }
    async GetAllServers() {
        await this.SyncAllServerStatuses();
        return Array.from(this.Servers.values());
    }
    async GetServersByOwner(ownerId) {
        await this.SyncAllServerStatuses();
        return Array.from(this.Servers.values()).filter((s) => s.OwnerId === ownerId);
    }
    async SendCommand(serverId, command) {
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
    async GetLogs(serverId, tailLines = 100) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        return await this.LogStreamer.GetRecentLogs(server.ContainerId, tailLines);
    }
    async StreamLogs(serverId, callback) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        return await this.LogStreamer.StreamLogs(server.ContainerId, callback);
    }
    async StreamStats(serverId, callback) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        return await this.StatsCollector.StreamStats(serverId, server.ContainerId, callback);
    }
    async InspectServer(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        return await this.ContainerManager.InspectContainer(server.ContainerId);
    }
    async UpdateServerConfig(serverId, updates) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        if (updates.EnvironmentVariables) {
            server.EnvironmentVariables = updates.EnvironmentVariables;
            try {
                const newContainerId = await this.ContainerManager.RecreateContainerWithNewEnv(server.ContainerId, updates.EnvironmentVariables);
                server.ContainerId = newContainerId;
            }
            catch { }
        }
        if (updates.AutoRestart !== undefined) {
            server.AutoRestart = updates.AutoRestart;
        }
        if (updates.RestartPolicy) {
            server.RestartPolicy = updates.RestartPolicy;
            try {
                await this.ContainerManager.UpdateContainerLimits(server.ContainerId, undefined, undefined, updates.RestartPolicy);
            }
            catch { }
        }
        if (updates.Limits) {
            server.Limits = updates.Limits;
            if (server.Status === "Running") {
                try {
                    await this.ContainerManager.UpdateContainerLimits(server.ContainerId, updates.Limits.Memory, updates.Limits.CpuShares ? updates.Limits.CpuShares * 1e7 : undefined, server.RestartPolicy);
                }
                catch { }
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
    async UpdateEnvironmentVariables(serverId, env) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.EnvironmentVariables = env;
        const newContainerId = await this.ContainerManager.RecreateContainerWithNewEnv(server.ContainerId, env);
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
    async UpdateRestartPolicy(serverId, policy) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.RestartPolicy = policy;
        await this.ContainerManager.UpdateContainerLimits(server.ContainerId, undefined, undefined, policy);
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
    GetVolumeService() {
        return this.VolumeService;
    }
    GetBackupService() {
        return this.BackupService;
    }
    GetServerAuditLogs(serverId) {
        return this.DatabaseManager.GetAuditLogsForServer(serverId);
    }
    async AddServerPort(serverId, port) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const exists = server.Ports.some((p) => p.ContainerPort === port.ContainerPort && p.Protocol === port.Protocol);
        if (exists) {
            throw new Error(`Port ${port.ContainerPort}/${port.Protocol} is already mapped`);
        }
        const updatedPorts = [...server.Ports, port];
        const newContainerId = await this.ContainerManager.RecreateContainerWithNewPorts(server.ContainerId, updatedPorts);
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
    async RemoveServerPort(serverId, containerPort, protocol) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const updatedPorts = server.Ports.filter((p) => !(p.ContainerPort === containerPort && p.Protocol === protocol));
        if (updatedPorts.length === server.Ports.length) {
            throw new Error(`Port mapping ${containerPort}/${protocol} not found`);
        }
        const newContainerId = await this.ContainerManager.RecreateContainerWithNewPorts(server.ContainerId, updatedPorts);
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
    async CloneServer(sourceServerId, newName) {
        const source = this.Servers.get(sourceServerId);
        if (!source) {
            throw new Error(`Source server ${sourceServerId} not found`);
        }
        const template = this.TemplateService.GetTemplate(source.TemplateId);
        if (!template) {
            throw new Error(`Template not found: ${source.TemplateId}`);
        }
        const allAllocatedHostPorts = new Set();
        for (const s of this.Servers.values()) {
            for (const p of s.Ports) {
                allAllocatedHostPorts.add(p.HostPort);
            }
        }
        const clonedPorts = source.Ports.map((p) => {
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
        }
        catch { }
        this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "SERVER_CLONE",
            IpAddress: "system",
            Details: `Cloned server "${source.Name}" to "${newName}" (${newServer.Id})`,
        });
        return newServer;
    }
    RotateWebhookToken(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.WebhookToken = crypto.randomBytes(24).toString("hex");
        this.SaveServers().catch(() => { });
        this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "WEBHOOK_ROTATE",
            IpAddress: "system",
            Details: `Rotated deploy webhook token for server ${server.Name}`,
        });
        return server.WebhookToken;
    }
    async TriggerWebhook(serverId, token) {
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
    async BulkStartAll() {
        const all = Array.from(this.Servers.values());
        let successCount = 0;
        for (const server of all) {
            if (server.Status !== "Running") {
                try {
                    await this.StartServer(server.Id);
                    successCount++;
                }
                catch { }
            }
        }
        return { SuccessCount: successCount, TotalCount: all.length };
    }
    async BulkStopAll() {
        const all = Array.from(this.Servers.values());
        let successCount = 0;
        for (const server of all) {
            if (server.Status === "Running") {
                try {
                    await this.StopServer(server.Id);
                    successCount++;
                }
                catch { }
            }
        }
        return { SuccessCount: successCount, TotalCount: all.length };
    }
    async BulkRestartAll() {
        const all = Array.from(this.Servers.values());
        let successCount = 0;
        for (const server of all) {
            if (server.Status === "Running") {
                try {
                    await this.RestartServer(server.Id);
                    successCount++;
                }
                catch { }
            }
        }
        return { SuccessCount: successCount, TotalCount: all.length };
    }
    async DispatchAlertWebhook(server, title, description, severity = "info") {
        if (!server.AlertWebhookUrl)
            return;
        const colorMap = {
            info: 3447003,
            warning: 16776960,
            danger: 15158332,
            success: 3066993,
        };
        try {
            const isDiscord = server.AlertWebhookUrl.includes("discord.com") ||
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
        }
        catch { }
    }
    async RunWatchdogCycle() {
        for (const server of this.Servers.values()) {
            try {
                const inspect = await this.ContainerManager.InspectContainer(server.ContainerId);
                const previousStatus = server.Status;
                server.OomKilled = Boolean(inspect.State.OOMKilled);
                server.HealthStatus = inspect.State.Health?.Status || "none";
                if (inspect.State.Health?.Log) {
                    server.HealthLogs = inspect.State.Health.Log
                        .slice(-5)
                        .map((l) => ({
                        Start: l.Start || "",
                        End: l.End || "",
                        ExitCode: l.ExitCode ?? 0,
                        Output: l.Output || "",
                    }));
                }
                if (inspect.State.Running) {
                    server.Status = "Running";
                }
                else if (inspect.State.Restarting) {
                    server.Status = "Restarting";
                }
                else {
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
                    await this.DispatchAlertWebhook(server, "Container Crashed Unexpectedly", `Server "${server.Name}" exited with code ${inspect.State.ExitCode}. Reason: ${reason}. Total recorded crashes: ${server.CrashCount}.`, "danger");
                }
            }
            catch { }
        }
        await this.SaveServers();
    }
    StartWatchdog(intervalMs = 15000) {
        setInterval(() => {
            this.RunWatchdogCycle().catch(() => { });
        }, intervalMs);
    }
    async UpdateAlertWebhook(serverId, alertWebhookUrl) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.AlertWebhookUrl = alertWebhookUrl?.trim() || undefined;
        await this.SaveServers();
        return server;
    }
    async TestAlertWebhook(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        if (!server.AlertWebhookUrl) {
            throw new Error("No alert webhook configured for this server");
        }
        await this.DispatchAlertWebhook(server, "Test Notification", `Test alert triggered from QiR Control Panel for server "${server.Name}". Webhook communication is fully operational.`, "info");
    }
    async ExportVolumeArchive(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const safeName = server.Name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const backup = await this.BackupService.CreateBackup(serverId, `${safeName}_export`);
        const filePath = this.BackupService.GetBackupFilePath(serverId, backup.FileName);
        return { FilePath: filePath, FileName: backup.FileName };
    }
    async GetServerProcesses(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        return await this.ContainerManager.GetContainerProcesses(server.ContainerId);
    }
    async RedeployServer(serverId, newImage) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const targetImage = (newImage && newImage.trim()) || server.Image;
        if (!targetImage) {
            throw new Error("No image defined for container rollout");
        }
        const newContainerId = await this.ContainerManager.RecreateContainerWithNewImage(server.ContainerId, targetImage);
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
    async PauseServer(serverId) {
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
    async UnpauseServer(serverId) {
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
    async ProbePort(serverId, port, host = "127.0.0.1") {
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
            socket.on("error", (err) => {
                socket.destroy();
                resolve({ Reachable: false, LatencyMs: null, Error: err.message });
            });
            socket.connect(port, host);
        });
    }
    GenerateDockerCompose(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const serviceName = server.Name.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "app";
        const lines = [
            'version: "3.8"',
            "",
            "services:",
            `  ${serviceName}:`,
            `    image: ${server.Image || "alpine:latest"}`,
            `    container_name: ${server.Name}`,
            `    restart: ${server.RestartPolicy || (server.AutoRestart ? "unless-stopped" : "no")}`,
        ];
        if (server.Ports && server.Ports.length > 0) {
            lines.push("    ports:");
            for (const p of server.Ports) {
                lines.push(`      - "${p.HostPort}:${p.ContainerPort}${p.Protocol === "udp" ? "/udp" : ""}"`);
            }
        }
        if (server.EnvironmentVariables && Object.keys(server.EnvironmentVariables).length > 0) {
            lines.push("    environment:");
            for (const [k, v] of Object.entries(server.EnvironmentVariables)) {
                lines.push(`      - ${k}=${v}`);
            }
        }
        lines.push("    volumes:");
        lines.push(`      - ./${server.Name}_data:/app/data`);
        if (server.Limits && (server.Limits.MemoryBytes || server.Limits.CpuShares)) {
            lines.push("    deploy:");
            lines.push("      resources:");
            lines.push("        limits:");
            if (server.Limits.MemoryBytes) {
                lines.push(`          memory: ${Math.round(server.Limits.MemoryBytes / (1024 * 1024))}M`);
            }
            if (server.Limits.CpuShares) {
                lines.push(`          cpus: "${(server.Limits.CpuShares / 100).toFixed(1)}"`);
            }
        }
        return lines.join("\n") + "\n";
    }
    async UpdateServerTags(serverId, tags) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        server.Tags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
        await this.SaveServers();
        return server;
    }
    async BatchDeleteFiles(serverId, relativePaths) {
        const volume = this.VolumeService;
        let deletedCount = 0;
        for (const p of relativePaths) {
            try {
                await volume.DeleteFile(serverId, p);
                deletedCount++;
            }
            catch { }
        }
        return deletedCount;
    }
    async GetServerFilesystemChanges(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        return await this.ContainerManager.GetContainerChanges(server.ContainerId);
    }
    async ScanServerSockets(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const result = await this.ContainerManager.ExecuteCommand(server.ContainerId, [
            "sh",
            "-c",
            "ss -tulpn 2>/dev/null || netstat -tlpn 2>/dev/null || cat /proc/net/tcp 2>/dev/null || echo ''",
        ]);
        const output = result.Output || "";
        const lines = output.split("\n");
        const sockets = [];
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith("Proto") || line.startsWith("Netid") || line.startsWith("Active"))
                continue;
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
                const proto = parts[0];
                const state = parts.length > 5 && (parts[1] === "LISTEN" || parts[5] === "LISTEN") ? "LISTEN" : (parts[1] || "LISTEN");
                const local = parts.find((p) => p.includes(":") && !p.startsWith("users:") && !p.startsWith("pid=")) || parts[3] || parts[4];
                if (local && local.includes(":")) {
                    const lastColon = local.lastIndexOf(":");
                    const addr = local.slice(0, lastColon) || "0.0.0.0";
                    const port = Number(local.slice(lastColon + 1)) || 0;
                    if (port > 0) {
                        sockets.push({
                            Protocol: proto,
                            LocalAddress: addr,
                            Port: port,
                            ForeignAddress: "*:*",
                            State: state,
                            Process: parts[parts.length - 1] || "",
                        });
                    }
                }
            }
        }
        return sockets;
    }
    async ExecuteDatabaseQuery(serverId, rawQuery) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const tId = server.TemplateId.toLowerCase();
        const env = server.EnvironmentVariables || {};
        let cmd = "";
        if (tId.includes("redis")) {
            const pwd = env.REDIS_PASSWORD || "";
            cmd = pwd
                ? `redis-cli -a "${pwd.replace(/"/g, '\\"')}" ${rawQuery}`
                : `redis-cli ${rawQuery}`;
        }
        else if (tId.includes("postgresql")) {
            const user = env.POSTGRES_USER || "postgres";
            const db = env.POSTGRES_DB || "postgres";
            cmd = `psql -U "${user}" -d "${db}" -c "${rawQuery.replace(/"/g, '\\"')}"`;
        }
        else if (tId.includes("mariadb") || tId.includes("mysql")) {
            const pwd = env.MYSQL_ROOT_PASSWORD || "";
            const db = env.MYSQL_DATABASE || "";
            const dbFlag = db ? ` -D "${db}"` : "";
            cmd = pwd
                ? `mariadb -uroot -p"${pwd.replace(/"/g, '\\"')}"${dbFlag} -e "${rawQuery.replace(/"/g, '\\"')}"`
                : `mariadb -uroot${dbFlag} -e "${rawQuery.replace(/"/g, '\\"')}"`;
        }
        else if (tId.includes("mongo")) {
            cmd = `mongosh --eval "${rawQuery.replace(/"/g, '\\"')}"`;
        }
        else {
            throw new Error("This container does not use a supported database blueprint");
        }
        const startTime = Date.now();
        const output = await this.SendCommand(serverId, cmd);
        const duration = Date.now() - startTime;
        return { Output: output, ExecutionTimeMs: duration };
    }
    async SuggestAvailablePort(startPort = 3000) {
        const allocated = new Set();
        for (const s of this.Servers.values()) {
            for (const p of s.Ports) {
                allocated.add(p.HostPort);
            }
        }
        let candidate = Math.max(1024, startPort);
        while (allocated.has(candidate)) {
            candidate++;
        }
        return candidate;
    }
    async GrepFiles(serverId, pattern, maxResults = 40) {
        return await this.VolumeService.GrepVolumeFiles(serverId, pattern, maxResults);
    }
    async SendTestAlertWebhook(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const webhookUrl = server.AlertWebhookUrl;
        if (!webhookUrl) {
            throw new Error("No Alert Webhook URL configured on this server");
        }
        try {
            const payload = {
                Event: "TEST_ALERT",
                ServerId: server.Id,
                ServerName: server.Name,
                Message: `[TEST] Diagnostic webhook alert test from QiR instance "${server.Name}".`,
                Timestamp: new Date().toISOString(),
            };
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const text = await res.text();
            return {
                Success: res.ok,
                StatusCode: res.status,
                ResponseBody: text.slice(0, 200),
            };
        }
        catch (err) {
            return {
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to connect to webhook URL",
            };
        }
    }
    async GetServerQuickFacts(serverId) {
        const server = this.Servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        const inspect = (await this.ContainerManager.InspectContainer(server.ContainerId));
        const networkSettings = inspect.NetworkSettings || {};
        const defaultNet = networkSettings.Networks?.bridge || Object.values(networkSettings.Networks || {})[0] || {};
        return {
            Architecture: inspect.Platform || "linux/amd64",
            Driver: inspect.Driver || "overlay2",
            BridgeIp: defaultNet.IPAddress || networkSettings.IPAddress || "172.17.0.2",
            MacAddress: defaultNet.MacAddress || networkSettings.MacAddress || "02:42:ac:11:00:02",
            HostPid: inspect.State?.Pid || 0,
            StartedAt: inspect.State?.StartedAt || "",
            ImageSha: (inspect.Image || "").slice(0, 19),
        };
    }
}
