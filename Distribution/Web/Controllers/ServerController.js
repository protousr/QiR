import fs from "node:fs";
import path from "node:path";
import { ServerService } from "../../Core/Services/ServerService.js";
import { ScheduleService } from "../../Core/Services/ScheduleService.js";
import { CreateServerSchema, SendCommandSchema } from "../Middleware/ValidationMiddleware.js";
export class ServerController {
    ServerService;
    ScheduleService;
    constructor() {
        this.ServerService = ServerService.GetInstance();
        this.ScheduleService = ScheduleService.GetInstance();
    }
    GetAllServers = async (request, reply) => {
        let servers = await this.ServerService.GetAllServers();
        if (request.User && request.User.Role !== "admin") {
            servers = servers.filter((s) => s.OwnerId === request.User?.Id);
        }
        reply.send({ Success: true, Data: servers });
    };
    GetServerById = async (request, reply) => {
        const server = await this.ServerService.GetServer(request.params.Id);
        if (!server) {
            reply.status(404).send({ Success: false, Error: "Server not found" });
            return;
        }
        reply.send({ Success: true, Data: server });
    };
    CreateServer = async (request, reply) => {
        const validation = CreateServerSchema.safeParse(request.body);
        if (!validation.success) {
            reply.status(400).send({ Success: false, Error: validation.error.format() });
            return;
        }
        try {
            const serverInput = {
                ...validation.data,
                OwnerId: request.User?.Id,
                OwnerUsername: request.User?.Username,
            };
            const server = await this.ServerService.CreateServer(serverInput);
            reply.status(201).send({ Success: true, Data: server });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to create server",
            });
        }
    };
    StartServer = async (request, reply) => {
        try {
            await this.ServerService.StartServer(request.params.Id);
            reply.send({ Success: true, Message: "Server started successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to start server",
            });
        }
    };
    StopServer = async (request, reply) => {
        try {
            await this.ServerService.StopServer(request.params.Id);
            reply.send({ Success: true, Message: "Server stopped successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to stop server",
            });
        }
    };
    KillServer = async (request, reply) => {
        try {
            await this.ServerService.KillServer(request.params.Id);
            reply.send({ Success: true, Message: "Server killed successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to kill server",
            });
        }
    };
    RestartServer = async (request, reply) => {
        try {
            await this.ServerService.RestartServer(request.params.Id);
            reply.send({ Success: true, Message: "Server restarted successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to restart server",
            });
        }
    };
    DeleteServer = async (request, reply) => {
        try {
            await this.ServerService.DeleteServer(request.params.Id);
            reply.send({ Success: true, Message: "Server deleted successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to delete server",
            });
        }
    };
    SendCommand = async (request, reply) => {
        const validation = SendCommandSchema.safeParse(request.body);
        if (!validation.success) {
            reply.status(400).send({ Success: false, Error: validation.error.format() });
            return;
        }
        try {
            const output = await this.ServerService.SendCommand(request.params.Id, validation.data.Command);
            reply.send({ Success: true, Data: { Output: output } });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to execute command",
            });
        }
    };
    GetLogs = async (request, reply) => {
        try {
            const tail = Number(request.query.Tail) || 100;
            const logs = await this.ServerService.GetLogs(request.params.Id, tail);
            reply.send({ Success: true, Data: { Logs: logs } });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to fetch logs",
            });
        }
    };
    ListVolumeFiles = async (request, reply) => {
        try {
            const files = await this.ServerService.GetVolumeService().ListFiles(request.params.Id, request.query.SubPath || "");
            reply.send({ Success: true, Data: files });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to list files",
            });
        }
    };
    ReadVolumeFile = async (request, reply) => {
        try {
            const content = await this.ServerService.GetVolumeService().ReadFile(request.params.Id, request.query.FilePath);
            reply.send({ Success: true, Data: { Content: content } });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to read file",
            });
        }
    };
    WriteVolumeFile = async (request, reply) => {
        try {
            await this.ServerService.GetVolumeService().WriteFile(request.params.Id, request.body.FilePath, request.body.Content);
            reply.send({ Success: true, Message: "File saved successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to write file",
            });
        }
    };
    DeleteVolumeFile = async (request, reply) => {
        try {
            await this.ServerService.GetVolumeService().DeleteFile(request.params.Id, request.query.FilePath);
            reply.send({ Success: true, Message: "File deleted successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to delete file",
            });
        }
    };
    InspectServer = async (request, reply) => {
        try {
            const inspect = await this.ServerService.InspectServer(request.params.Id);
            reply.send({ Success: true, Data: inspect });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to inspect container",
            });
        }
    };
    UpdateServerConfig = async (request, reply) => {
        try {
            const updated = await this.ServerService.UpdateServerConfig(request.params.Id, request.body);
            reply.send({ Success: true, Data: updated });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to update configuration",
            });
        }
    };
    UpdateEnvironmentVariables = async (request, reply) => {
        try {
            const updated = await this.ServerService.UpdateEnvironmentVariables(request.params.Id, request.body.EnvironmentVariables);
            reply.send({ Success: true, Data: updated });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to update environment variables",
            });
        }
    };
    UpdateRestartPolicy = async (request, reply) => {
        try {
            const updated = await this.ServerService.UpdateRestartPolicy(request.params.Id, request.body.RestartPolicy);
            reply.send({ Success: true, Data: updated });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to update restart policy",
            });
        }
    };
    DownloadVolumeFile = async (request, reply) => {
        try {
            const buffer = await this.ServerService.GetVolumeService().GetFileBuffer(request.params.Id, request.query.FilePath);
            const filename = path.basename(request.query.FilePath);
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);
            reply.send(buffer);
        }
        catch (err) {
            reply.status(404).send({ Success: false, Error: "File not found" });
        }
    };
    UploadVolumeFile = async (request, reply) => {
        try {
            const buffer = Buffer.from(request.body.ContentBase64, "base64");
            await this.ServerService.GetVolumeService().WriteFileBuffer(request.params.Id, request.body.FilePath, buffer);
            reply.send({ Success: true, Message: "File uploaded successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to upload file",
            });
        }
    };
    CreateVolumeDirectory = async (request, reply) => {
        try {
            await this.ServerService.GetVolumeService().CreateDirectory(request.params.Id, request.body.Path);
            reply.send({ Success: true, Message: "Directory created successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to create directory",
            });
        }
    };
    RenameVolumeFile = async (request, reply) => {
        try {
            await this.ServerService.GetVolumeService().Rename(request.params.Id, request.body.OldPath, request.body.NewPath);
            reply.send({ Success: true, Message: "Renamed successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to rename",
            });
        }
    };
    ExtractVolumeArchive = async (request, reply) => {
        try {
            await this.ServerService.GetVolumeService().ExtractArchive(request.params.Id, request.body.ArchivePath, request.body.Destination || "");
            reply.send({ Success: true, Message: "Archive extracted successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to extract archive",
            });
        }
    };
    CompressVolumeFiles = async (request, reply) => {
        try {
            const archiveName = await this.ServerService.GetVolumeService().CompressFiles(request.params.Id, request.body.Paths || [], request.body.ArchiveName || "archive.tar.gz");
            reply.send({ Success: true, Data: { ArchiveName: archiveName } });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to compress files",
            });
        }
    };
    UpdateAlertWebhook = async (request, reply) => {
        try {
            const updated = await this.ServerService.UpdateAlertWebhook(request.params.Id, request.body.AlertWebhookUrl);
            reply.send({ Success: true, Data: updated });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to update alert webhook",
            });
        }
    };
    TestAlertWebhook = async (request, reply) => {
        try {
            await this.ServerService.TestAlertWebhook(request.params.Id);
            reply.send({ Success: true, Message: "Alert notification dispatched successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to dispatch alert",
            });
        }
    };
    ListBackups = async (request, reply) => {
        try {
            const backups = await this.ServerService.GetBackupService().ListBackups(request.params.Id);
            reply.send({ Success: true, Data: backups });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to list backups",
            });
        }
    };
    CreateBackup = async (request, reply) => {
        try {
            const backup = await this.ServerService.GetBackupService().CreateBackup(request.params.Id, request.body?.Name);
            reply.status(201).send({ Success: true, Data: backup });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to create backup",
            });
        }
    };
    RestoreBackup = async (request, reply) => {
        try {
            await this.ServerService.GetBackupService().RestoreBackup(request.params.Id, request.params.FileName);
            reply.send({ Success: true, Message: "Backup restored successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to restore backup",
            });
        }
    };
    DeleteBackup = async (request, reply) => {
        try {
            await this.ServerService.GetBackupService().DeleteBackup(request.params.Id, request.params.FileName);
            reply.send({ Success: true, Message: "Backup deleted successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to delete backup",
            });
        }
    };
    DownloadBackup = async (request, reply) => {
        try {
            const filePath = this.ServerService.GetBackupService().GetBackupFilePath(request.params.Id, request.params.FileName);
            reply.header("Content-Disposition", `attachment; filename="${request.params.FileName}"`);
            reply.header("Content-Type", "application/gzip");
            const stream = fs.createReadStream(filePath);
            reply.send(stream);
        }
        catch (err) {
            reply.status(404).send({ Success: false, Error: "Backup not found" });
        }
    };
    GetServerAuditLogs = async (request, reply) => {
        try {
            const logs = this.ServerService.GetServerAuditLogs(request.params.Id);
            reply.send({ Success: true, Data: logs });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to fetch audit logs",
            });
        }
    };
    AddPort = async (request, reply) => {
        try {
            const { HostPort, ContainerPort, Protocol } = request.body;
            if (!HostPort || !ContainerPort) {
                reply.status(400).send({ Success: false, Error: "HostPort and ContainerPort are required" });
                return;
            }
            const updated = await this.ServerService.AddServerPort(request.params.Id, {
                HostPort: Number(HostPort),
                ContainerPort: Number(ContainerPort),
                Protocol: Protocol || "tcp",
            });
            reply.send({ Success: true, Data: updated, Message: "Port allocated and container updated" });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to add port" });
        }
    };
    RemovePort = async (request, reply) => {
        try {
            const updated = await this.ServerService.RemoveServerPort(request.params.Id, Number(request.params.ContainerPort), request.params.Protocol || "tcp");
            reply.send({ Success: true, Data: updated, Message: "Port removed successfully" });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to remove port" });
        }
    };
    CloneServer = async (request, reply) => {
        try {
            const cloned = await this.ServerService.CloneServer(request.params.Id, request.body.NewName || `cloned-${Date.now()}`);
            reply.status(201).send({ Success: true, Data: cloned, Message: "Server cloned successfully" });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to clone server" });
        }
    };
    BulkStart = async (_request, reply) => {
        try {
            const result = await this.ServerService.BulkStartAll();
            reply.send({ Success: true, Data: result, Message: `Started ${result.SuccessCount} container(s)` });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Bulk start failed" });
        }
    };
    BulkStop = async (_request, reply) => {
        try {
            const result = await this.ServerService.BulkStopAll();
            reply.send({ Success: true, Data: result, Message: `Stopped ${result.SuccessCount} container(s)` });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Bulk stop failed" });
        }
    };
    BulkRestart = async (_request, reply) => {
        try {
            const result = await this.ServerService.BulkRestartAll();
            reply.send({ Success: true, Data: result, Message: `Restarted ${result.SuccessCount} container(s)` });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Bulk restart failed" });
        }
    };
    GetSchedules = async (request, reply) => {
        try {
            const schedules = this.ScheduleService.GetSchedulesForServer(request.params.Id);
            reply.send({ Success: true, Data: schedules });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to fetch schedules" });
        }
    };
    CreateSchedule = async (request, reply) => {
        try {
            const schedule = this.ScheduleService.CreateSchedule(request.params.Id, request.body);
            reply.status(201).send({ Success: true, Data: schedule, Message: "Schedule created successfully" });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to create schedule" });
        }
    };
    DeleteSchedule = async (request, reply) => {
        try {
            this.ScheduleService.DeleteSchedule(request.params.ScheduleId);
            reply.send({ Success: true, Message: "Schedule deleted successfully" });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to delete schedule" });
        }
    };
    RunSchedule = async (request, reply) => {
        try {
            await this.ScheduleService.TriggerScheduleNow(request.params.ScheduleId);
            reply.send({ Success: true, Message: "Schedule triggered successfully" });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to run schedule" });
        }
    };
    GetWebhook = async (request, reply) => {
        try {
            const server = await this.ServerService.GetServer(request.params.Id);
            if (!server) {
                reply.status(404).send({ Success: false, Error: "Server not found" });
                return;
            }
            reply.send({
                Success: true,
                Data: {
                    Token: server.WebhookToken,
                    WebhookUrl: `/api/webhooks/${server.Id}/${server.WebhookToken}`,
                },
            });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to get webhook" });
        }
    };
    RotateWebhook = async (request, reply) => {
        try {
            const token = this.ServerService.RotateWebhookToken(request.params.Id);
            reply.send({
                Success: true,
                Data: {
                    Token: token,
                    WebhookUrl: `/api/webhooks/${request.params.Id}/${token}`,
                },
                Message: "Webhook token rotated successfully",
            });
        }
        catch (err) {
            reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to rotate webhook" });
        }
    };
    PublicWebhookTrigger = async (request, reply) => {
        try {
            await this.ServerService.TriggerWebhook(request.params.Id, request.params.Token);
            reply.send({ Success: true, Message: "Deploy webhook executed successfully" });
        }
        catch (err) {
            reply.status(401).send({ Success: false, Error: err instanceof Error ? err.message : "Webhook trigger failed" });
        }
    };
    ExecuteQuickCommand = async (request, reply) => {
        try {
            const command = request.body?.Command;
            if (!command || typeof command !== "string") {
                reply.status(400).send({ Success: false, Error: "Command string is required" });
                return;
            }
            const output = await this.ServerService.SendCommand(request.params.Id, command);
            reply.send({ Success: true, Data: { Output: output } });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Command execution failed",
            });
        }
    };
    ExportVolumeArchive = async (request, reply) => {
        try {
            const archive = await this.ServerService.ExportVolumeArchive(request.params.Id);
            reply.header("Content-Disposition", `attachment; filename="${archive.FileName}"`);
            reply.header("Content-Type", "application/gzip");
            const stream = fs.createReadStream(archive.FilePath);
            reply.send(stream);
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to export volume",
            });
        }
    };
    GetServerProcesses = async (request, reply) => {
        try {
            const top = await this.ServerService.GetServerProcesses(request.params.Id);
            reply.send({ Success: true, Data: top });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to fetch container processes",
            });
        }
    };
    RedeployServer = async (request, reply) => {
        try {
            const server = await this.ServerService.RedeployServer(request.params.Id, request.body?.Image);
            reply.send({
                Success: true,
                Data: server,
                Message: "Container redeployed successfully with latest image",
            });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Redeploy failed",
            });
        }
    };
    PauseServer = async (request, reply) => {
        try {
            await this.ServerService.PauseServer(request.params.Id);
            reply.send({ Success: true, Message: "Server container paused" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to pause server",
            });
        }
    };
    UnpauseServer = async (request, reply) => {
        try {
            await this.ServerService.UnpauseServer(request.params.Id);
            reply.send({ Success: true, Message: "Server container unpaused" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to unpause server",
            });
        }
    };
    ProbeServerPort = async (request, reply) => {
        try {
            const { Port, Host } = request.body;
            if (!Port) {
                reply.status(400).send({ Success: false, Error: "Port is required" });
                return;
            }
            const result = await this.ServerService.ProbePort(request.params.Id, Number(Port), Host);
            reply.send({ Success: true, Data: result });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to probe port",
            });
        }
    };
    GetDockerCompose = async (request, reply) => {
        try {
            const yaml = this.ServerService.GenerateDockerCompose(request.params.Id);
            reply.send({ Success: true, Data: { ComposeYaml: yaml } });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to generate docker compose",
            });
        }
    };
    UpdateServerTags = async (request, reply) => {
        try {
            const { Tags } = request.body || {};
            const updated = await this.ServerService.UpdateServerTags(request.params.Id, Array.isArray(Tags) ? Tags : []);
            reply.send({ Success: true, Data: updated, Message: "Server tags updated successfully" });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to update tags",
            });
        }
    };
    BatchDeleteFiles = async (request, reply) => {
        try {
            const { Paths } = request.body || {};
            if (!Array.isArray(Paths) || Paths.length === 0) {
                reply.status(400).send({ Success: false, Error: "Paths array is required" });
                return;
            }
            const count = await this.ServerService.BatchDeleteFiles(request.params.Id, Paths);
            reply.send({ Success: true, Data: { DeletedCount: count }, Message: `Deleted ${count} files successfully` });
        }
        catch (err) {
            reply.status(500).send({
                Success: false,
                Error: err instanceof Error ? err.message : "Failed to batch delete files",
            });
        }
    };
}
