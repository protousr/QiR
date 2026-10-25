import type { FastifyReply, FastifyRequest } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { ServerService } from "../../Core/Services/ServerService.js";
import { CreateServerSchema, SendCommandSchema } from "../Middleware/ValidationMiddleware.js";

export class ServerController {
  private readonly ServerService: ServerService;

  public constructor() {
    this.ServerService = ServerService.GetInstance();
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
}
