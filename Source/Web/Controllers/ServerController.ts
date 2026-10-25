import type { FastifyReply, FastifyRequest } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { ServerService } from "../../Core/Services/ServerService.js";
import { ScheduleService } from "../../Core/Services/ScheduleService.js";
import { CreateServerSchema, SendCommandSchema } from "../Middleware/ValidationMiddleware.js";
import type { IPortMapping } from "../../Core/Types/ServerTypes.js";

export class ServerController {
  private readonly ServerService: ServerService;
  private readonly ScheduleService: ScheduleService;

  public constructor() {
    this.ServerService = ServerService.GetInstance();
    this.ScheduleService = ScheduleService.GetInstance();
  }

  public GetAllServers = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    let servers = await this.ServerService.GetAllServers();
    if (request.User && request.User.Role !== "admin") {
      servers = servers.filter((s) => s.OwnerId === request.User?.Id);
    }
    reply.send({ Success: true, Data: servers });
  };

  public GetServerById = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const server = await this.ServerService.GetServer(request.params.Id);
    if (!server) {
      reply.status(404).send({ Success: false, Error: "Server not found" });
      return;
    }
    reply.send({ Success: true, Data: server });
  };

  public CreateServer = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to create server",
      });
    }
  };

  public StartServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.StartServer(request.params.Id);
      reply.send({ Success: true, Message: "Server started successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to start server",
      });
    }
  };

  public StopServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.StopServer(request.params.Id);
      reply.send({ Success: true, Message: "Server stopped successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to stop server",
      });
    }
  };

  public KillServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.KillServer(request.params.Id);
      reply.send({ Success: true, Message: "Server killed successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to kill server",
      });
    }
  };

  public RestartServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.RestartServer(request.params.Id);
      reply.send({ Success: true, Message: "Server restarted successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to restart server",
      });
    }
  };

  public DeleteServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.DeleteServer(request.params.Id);
      reply.send({ Success: true, Message: "Server deleted successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to delete server",
      });
    }
  };

  public SendCommand = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const validation = SendCommandSchema.safeParse(request.body);
    if (!validation.success) {
      reply.status(400).send({ Success: false, Error: validation.error.format() });
      return;
    }

    try {
      const output = await this.ServerService.SendCommand(
        request.params.Id,
        validation.data.Command
      );
      reply.send({ Success: true, Data: { Output: output } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to execute command",
      });
    }
  };

  public GetLogs = async (
    request: FastifyRequest<{ Params: { Id: string }; Querystring: { Tail?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const tail = Number(request.query.Tail) || 100;
      const logs = await this.ServerService.GetLogs(request.params.Id, tail);
      reply.send({ Success: true, Data: { Logs: logs } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to fetch logs",
      });
    }
  };

  public ListVolumeFiles = async (
    request: FastifyRequest<{ Params: { Id: string }; Querystring: { SubPath?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const files = await this.ServerService.GetVolumeService().ListFiles(
        request.params.Id,
        request.query.SubPath || ""
      );
      reply.send({ Success: true, Data: files });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to list files",
      });
    }
  };

  public ReadVolumeFile = async (
    request: FastifyRequest<{ Params: { Id: string }; Querystring: { FilePath: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const content = await this.ServerService.GetVolumeService().ReadFile(
        request.params.Id,
        request.query.FilePath
      );
      reply.send({ Success: true, Data: { Content: content } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to read file",
      });
    }
  };

  public WriteVolumeFile = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { FilePath: string; Content: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetVolumeService().WriteFile(
        request.params.Id,
        request.body.FilePath,
        request.body.Content
      );
      reply.send({ Success: true, Message: "File saved successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to write file",
      });
    }
  };

  public DeleteVolumeFile = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Querystring: { FilePath: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetVolumeService().DeleteFile(
        request.params.Id,
        request.query.FilePath
      );
      reply.send({ Success: true, Message: "File deleted successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to delete file",
      });
    }
  };

  public InspectServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const inspect = await this.ServerService.InspectServer(request.params.Id);
      reply.send({ Success: true, Data: inspect });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to inspect container",
      });
    }
  };

  public UpdateServerConfig = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: {
        EnvironmentVariables?: Record<string, string>;
        AutoRestart?: boolean;
        Limits?: { Memory?: number; CpuShares?: number };
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const updated = await this.ServerService.UpdateServerConfig(
        request.params.Id,
        request.body
      );
      reply.send({ Success: true, Data: updated });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to update configuration",
      });
    }
  };

  public UpdateEnvironmentVariables = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { EnvironmentVariables: Record<string, string> };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const updated = await this.ServerService.UpdateEnvironmentVariables(
        request.params.Id,
        request.body.EnvironmentVariables
      );
      reply.send({ Success: true, Data: updated });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to update environment variables",
      });
    }
  };

  public UpdateRestartPolicy = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { RestartPolicy: "unless-stopped" | "always" | "on-failure" | "no" };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const updated = await this.ServerService.UpdateRestartPolicy(
        request.params.Id,
        request.body.RestartPolicy
      );
      reply.send({ Success: true, Data: updated });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to update restart policy",
      });
    }
  };

  public DownloadVolumeFile = async (
    request: FastifyRequest<{ Params: { Id: string }; Querystring: { FilePath: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const buffer = await this.ServerService.GetVolumeService().GetFileBuffer(
        request.params.Id,
        request.query.FilePath
      );
      const filename = path.basename(request.query.FilePath);
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      reply.send(buffer);
    } catch (err) {
      reply.status(404).send({ Success: false, Error: "File not found" });
    }
  };

  public UploadVolumeFile = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { FilePath: string; ContentBase64: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const buffer = Buffer.from(request.body.ContentBase64, "base64");
      await this.ServerService.GetVolumeService().WriteFileBuffer(
        request.params.Id,
        request.body.FilePath,
        buffer
      );
      reply.send({ Success: true, Message: "File uploaded successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to upload file",
      });
    }
  };

  public CreateVolumeDirectory = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { Path: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetVolumeService().CreateDirectory(
        request.params.Id,
        request.body.Path
      );
      reply.send({ Success: true, Message: "Directory created successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to create directory",
      });
    }
  };

  public RenameVolumeFile = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { OldPath: string; NewPath: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetVolumeService().Rename(
        request.params.Id,
        request.body.OldPath,
        request.body.NewPath
      );
      reply.send({ Success: true, Message: "Renamed successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to rename",
      });
    }
  };

  public ExtractVolumeArchive = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { ArchivePath: string; Destination?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetVolumeService().ExtractArchive(
        request.params.Id,
        request.body.ArchivePath,
        request.body.Destination || ""
      );
      reply.send({ Success: true, Message: "Archive extracted successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to extract archive",
      });
    }
  };

  public CompressVolumeFiles = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { Paths?: string[]; ArchiveName?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const archiveName = await this.ServerService.GetVolumeService().CompressFiles(
        request.params.Id,
        request.body.Paths || [],
        request.body.ArchiveName || "archive.tar.gz"
      );
      reply.send({ Success: true, Data: { ArchiveName: archiveName } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to compress files",
      });
    }
  };

  public UpdateAlertWebhook = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { AlertWebhookUrl?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const updated = await this.ServerService.UpdateAlertWebhook(
        request.params.Id,
        request.body.AlertWebhookUrl
      );
      reply.send({ Success: true, Data: updated });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to update alert webhook",
      });
    }
  };

  public TestAlertWebhook = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.TestAlertWebhook(request.params.Id);
      reply.send({ Success: true, Message: "Alert notification dispatched successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to dispatch alert",
      });
    }
  };

  public ListBackups = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const backups = await this.ServerService.GetBackupService().ListBackups(request.params.Id);
      reply.send({ Success: true, Data: backups });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to list backups",
      });
    }
  };

  public CreateBackup = async (
    request: FastifyRequest<{ Params: { Id: string }; Body?: { Name?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const backup = await this.ServerService.GetBackupService().CreateBackup(
        request.params.Id,
        request.body?.Name
      );
      reply.status(201).send({ Success: true, Data: backup });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to create backup",
      });
    }
  };

  public RestoreBackup = async (
    request: FastifyRequest<{ Params: { Id: string; FileName: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetBackupService().RestoreBackup(
        request.params.Id,
        request.params.FileName
      );
      reply.send({ Success: true, Message: "Backup restored successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to restore backup",
      });
    }
  };

  public DeleteBackup = async (
    request: FastifyRequest<{ Params: { Id: string; FileName: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.GetBackupService().DeleteBackup(
        request.params.Id,
        request.params.FileName
      );
      reply.send({ Success: true, Message: "Backup deleted successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to delete backup",
      });
    }
  };

  public DownloadBackup = async (
    request: FastifyRequest<{ Params: { Id: string; FileName: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const filePath = this.ServerService.GetBackupService().GetBackupFilePath(
        request.params.Id,
        request.params.FileName
      );
      reply.header("Content-Disposition", `attachment; filename="${request.params.FileName}"`);
      reply.header("Content-Type", "application/gzip");
      const stream = fs.createReadStream(filePath);
      reply.send(stream);
    } catch (err) {
      reply.status(404).send({ Success: false, Error: "Backup not found" });
    }
  };

  public GetServerAuditLogs = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const logs = this.ServerService.GetServerAuditLogs(request.params.Id);
      reply.send({ Success: true, Data: logs });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to fetch audit logs",
      });
    }
  };

  public AddPort = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { HostPort: number; ContainerPort: number; Protocol: "tcp" | "udp" };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
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
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to add port" });
    }
  };

  public RemovePort = async (
    request: FastifyRequest<{
      Params: { Id: string; ContainerPort: string; Protocol: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const updated = await this.ServerService.RemoveServerPort(
        request.params.Id,
        Number(request.params.ContainerPort),
        request.params.Protocol || "tcp"
      );
      reply.send({ Success: true, Data: updated, Message: "Port removed successfully" });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to remove port" });
    }
  };

  public CloneServer = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { NewName: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const cloned = await this.ServerService.CloneServer(
        request.params.Id,
        request.body.NewName || `cloned-${Date.now()}`
      );
      reply.status(201).send({ Success: true, Data: cloned, Message: "Server cloned successfully" });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to clone server" });
    }
  };

  public BulkStart = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const result = await this.ServerService.BulkStartAll();
      reply.send({ Success: true, Data: result, Message: `Started ${result.SuccessCount} container(s)` });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Bulk start failed" });
    }
  };

  public BulkStop = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const result = await this.ServerService.BulkStopAll();
      reply.send({ Success: true, Data: result, Message: `Stopped ${result.SuccessCount} container(s)` });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Bulk stop failed" });
    }
  };

  public BulkRestart = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const result = await this.ServerService.BulkRestartAll();
      reply.send({ Success: true, Data: result, Message: `Restarted ${result.SuccessCount} container(s)` });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Bulk restart failed" });
    }
  };

  public GetSchedules = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const schedules = this.ScheduleService.GetSchedulesForServer(request.params.Id);
      reply.send({ Success: true, Data: schedules });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to fetch schedules" });
    }
  };

  public CreateSchedule = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { Name: string; TaskType: "Backup" | "Restart" | "Command"; IntervalMinutes: number; Command?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const schedule = this.ScheduleService.CreateSchedule(request.params.Id, request.body);
      reply.status(201).send({ Success: true, Data: schedule, Message: "Schedule created successfully" });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to create schedule" });
    }
  };

  public DeleteSchedule = async (
    request: FastifyRequest<{ Params: { Id: string; ScheduleId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      this.ScheduleService.DeleteSchedule(request.params.ScheduleId);
      reply.send({ Success: true, Message: "Schedule deleted successfully" });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to delete schedule" });
    }
  };

  public RunSchedule = async (
    request: FastifyRequest<{ Params: { Id: string; ScheduleId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ScheduleService.TriggerScheduleNow(request.params.ScheduleId);
      reply.send({ Success: true, Message: "Schedule triggered successfully" });
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to run schedule" });
    }
  };

  public GetWebhook = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
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
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to get webhook" });
    }
  };

  public RotateWebhook = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
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
    } catch (err) {
      reply.status(500).send({ Success: false, Error: err instanceof Error ? err.message : "Failed to rotate webhook" });
    }
  };

  public PublicWebhookTrigger = async (
    request: FastifyRequest<{ Params: { Id: string; Token: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.TriggerWebhook(request.params.Id, request.params.Token);
      reply.send({ Success: true, Message: "Deploy webhook executed successfully" });
    } catch (err) {
      reply.status(401).send({ Success: false, Error: err instanceof Error ? err.message : "Webhook trigger failed" });
    }
  };

  public ExecuteQuickCommand = async (
    request: FastifyRequest<{ Params: { Id: string }; Body: { Command: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const command = request.body?.Command;
      if (!command || typeof command !== "string") {
        reply.status(400).send({ Success: false, Error: "Command string is required" });
        return;
      }
      const output = await this.ServerService.SendCommand(request.params.Id, command);
      reply.send({ Success: true, Data: { Output: output } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Command execution failed",
      });
    }
  };

  public ExportVolumeArchive = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const archive = await this.ServerService.ExportVolumeArchive(request.params.Id);
      reply.header("Content-Disposition", `attachment; filename="${archive.FileName}"`);
      reply.header("Content-Type", "application/gzip");
      const stream = fs.createReadStream(archive.FilePath);
      reply.send(stream);
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to export volume",
      });
    }
  };

  public GetServerProcesses = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const top = await this.ServerService.GetServerProcesses(request.params.Id);
      reply.send({ Success: true, Data: top });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to fetch container processes",
      });
    }
  };

  public RedeployServer = async (
    request: FastifyRequest<{ Params: { Id: string }; Body?: { Image?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const server = await this.ServerService.RedeployServer(
        request.params.Id,
        request.body?.Image
      );
      reply.send({
        Success: true,
        Data: server,
        Message: "Container redeployed successfully with latest image",
      });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Redeploy failed",
      });
    }
  };

  public PauseServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.PauseServer(request.params.Id);
      reply.send({ Success: true, Message: "Server container paused" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to pause server",
      });
    }
  };

  public UnpauseServer = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await this.ServerService.UnpauseServer(request.params.Id);
      reply.send({ Success: true, Message: "Server container unpaused" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to unpause server",
      });
    }
  };

  public ProbeServerPort = async (
    request: FastifyRequest<{ Params: { Id: string }; Body: { Port: number; Host?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { Port, Host } = request.body;
      if (!Port) {
        reply.status(400).send({ Success: false, Error: "Port is required" });
        return;
      }
      const result = await this.ServerService.ProbePort(request.params.Id, Number(Port), Host);
      reply.send({ Success: true, Data: result });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to probe port",
      });
    }
  };

  public GetDockerCompose = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const yaml = this.ServerService.GenerateDockerCompose(request.params.Id);
      reply.send({ Success: true, Data: { ComposeYaml: yaml } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to generate docker compose",
      });
    }
  };

  public UpdateServerTags = async (
    request: FastifyRequest<{ Params: { Id: string }; Body: { Tags: string[] } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { Tags } = request.body || {};
      const updated = await this.ServerService.UpdateServerTags(request.params.Id, Array.isArray(Tags) ? Tags : []);
      reply.send({ Success: true, Data: updated, Message: "Server tags updated successfully" });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to update tags",
      });
    }
  };

  public BatchDeleteFiles = async (
    request: FastifyRequest<{ Params: { Id: string }; Body: { Paths: string[] } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { Paths } = request.body || {};
      if (!Array.isArray(Paths) || Paths.length === 0) {
        reply.status(400).send({ Success: false, Error: "Paths array is required" });
        return;
      }
      const count = await this.ServerService.BatchDeleteFiles(request.params.Id, Paths);
      reply.send({ Success: true, Data: { DeletedCount: count }, Message: `Deleted ${count} files successfully` });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to batch delete files",
      });
    }
  };

  public GetServerFilesystemChanges = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const changes = await this.ServerService.GetServerFilesystemChanges(request.params.Id);
      reply.send({ Success: true, Data: changes });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to fetch container changes",
      });
    }
  };

  public ScanServerSockets = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const sockets = await this.ServerService.ScanServerSockets(request.params.Id);
      reply.send({ Success: true, Data: sockets });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to scan container sockets",
      });
    }
  };

  public ExecuteDatabaseQuery = async (
    request: FastifyRequest<{ Params: { Id: string }; Body: { Query: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { Query } = request.body || {};
      if (!Query || typeof Query !== "string") {
        reply.status(400).send({ Success: false, Error: "Query string is required" });
        return;
      }
      const result = await this.ServerService.ExecuteDatabaseQuery(request.params.Id, Query);
      reply.send({ Success: true, Data: result });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Database query execution failed",
      });
    }
  };

  public SuggestAvailablePort = async (
    request: FastifyRequest<{ Querystring: { Start?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const startPort = Number(request.query?.Start) || 3000;
      const port = await this.ServerService.SuggestAvailablePort(startPort);
      reply.send({ Success: true, Data: { Port: port } });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to suggest available port",
      });
    }
  };

  public GrepFiles = async (
    request: FastifyRequest<{ Params: { Id: string }; Body: { Pattern: string; MaxResults?: number } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { Pattern, MaxResults } = request.body || {};
      if (!Pattern || typeof Pattern !== "string") {
        reply.status(400).send({ Success: false, Error: "Pattern string is required" });
        return;
      }
      const matches = await this.ServerService.GrepFiles(request.params.Id, Pattern, MaxResults || 40);
      reply.send({ Success: true, Data: matches });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to search files",
      });
    }
  };

  public SendTestAlertWebhook = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const result = await this.ServerService.SendTestAlertWebhook(request.params.Id);
      reply.send({ Success: true, Data: result });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to test alert webhook",
      });
    }
  };

  public GetServerQuickFacts = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const facts = await this.ServerService.GetServerQuickFacts(request.params.Id);
      reply.send({ Success: true, Data: facts });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to fetch container quick facts",
      });
    }
  };

  public GetGitStatus = async (
    request: FastifyRequest<{ Params: { Id: string }; Querystring: { SubPath?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const status = await this.ServerService.GetServerGitStatus(request.params.Id, request.query.SubPath);
      reply.send({ Success: true, Data: status });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to get Git status",
      });
    }
  };

  public SyncGit = async (
    request: FastifyRequest<{
      Params: { Id: string };
      Body: { RepoUrl?: string; Branch?: string; SubPath?: string; AutoRestart?: boolean };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const result = await this.ServerService.SyncServerGit(request.params.Id, request.body || {});
      reply.send({ Success: true, Data: result });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to sync Git repository",
      });
    }
  };
}
