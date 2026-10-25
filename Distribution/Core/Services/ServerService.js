import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
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
    }
    async LoadServers() {
        try {
            const data = await fs.readFile(this.DatabaseFilePath, "utf8");
            const list = JSON.parse(data);
            for (const server of list) {
                if (!server.WebhookToken) {
                    server.WebhookToken = crypto.randomBytes(24).toString("hex");
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
                if (inspect.State.Running) {
                    server.Status = "Running";
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
            OwnerId: input.OwnerId,
            OwnerUsername: input.OwnerUsername,
            WebhookToken: input.WebhookToken || crypto.randomBytes(24).toString("hex"),
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
            await this.ContainerManager.RestartContainer(server.ContainerId);
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
            await this.ContainerManager.RemoveContainer(server.ContainerId, true);
        }
        catch { }
        await this.VolumeService.DeleteServerVolume(serverId);
        this.Servers.delete(serverId);
        await this.SaveServers();
    }
    async GetServer(serverId) {
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
        }
        if (updates.AutoRestart !== undefined) {
            server.AutoRestart = updates.AutoRestart;
        }
        if (updates.Limits) {
            server.Limits = updates.Limits;
            if (server.Status === "Running") {
                try {
                    await this.ContainerManager.UpdateContainerLimits(server.ContainerId, updates.Limits.Memory, updates.Limits.CpuShares ? updates.Limits.CpuShares * 1e7 : undefined);
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
}
