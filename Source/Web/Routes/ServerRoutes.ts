import type { FastifyInstance } from "fastify";
import { ServerController } from "../Controllers/ServerController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";

export async function ServerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("preHandler", RequireAuth);
  const controller = new ServerController();

  fastify.get("/servers", controller.GetAllServers);
  fastify.get<{ Params: { Id: string } }>("/servers/:Id", controller.GetServerById);
  fastify.post("/servers", controller.CreateServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/start", controller.StartServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/stop", controller.StopServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/kill", controller.KillServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/restart", controller.RestartServer);
  fastify.delete<{ Params: { Id: string } }>("/servers/:Id", controller.DeleteServer);
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/inspect", controller.InspectServer);
  fastify.patch<{
    Params: { Id: string };
    Body: { EnvironmentVariables?: Record<string, string>; AutoRestart?: boolean };
  }>("/servers/:Id/config", controller.UpdateServerConfig);
  fastify.put<{
    Params: { Id: string };
    Body: { EnvironmentVariables: Record<string, string> };
  }>("/servers/:Id/env", controller.UpdateEnvironmentVariables);
  fastify.put<{
    Params: { Id: string };
    Body: { RestartPolicy: "unless-stopped" | "always" | "on-failure" | "no" };
  }>("/servers/:Id/restart-policy", controller.UpdateRestartPolicy);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/command", controller.SendCommand);
  fastify.get<{ Params: { Id: string }; Querystring: { Tail?: string } }>(
    "/servers/:Id/logs",
    controller.GetLogs
  );
  fastify.get<{ Params: { Id: string }; Querystring: { SubPath?: string } }>(
    "/servers/:Id/files",
    controller.ListVolumeFiles
  );
  fastify.delete<{ Params: { Id: string }; Querystring: { FilePath: string } }>(
    "/servers/:Id/files",
    controller.DeleteVolumeFile
  );
  fastify.get<{ Params: { Id: string }; Querystring: { FilePath: string } }>(
    "/servers/:Id/files/content",
    controller.ReadVolumeFile
  );
  fastify.post<{
    Params: { Id: string };
    Body: { FilePath: string; Content: string };
  }>("/servers/:Id/files/content", controller.WriteVolumeFile);
  fastify.get<{ Params: { Id: string }; Querystring: { FilePath: string } }>(
    "/servers/:Id/files/download",
    controller.DownloadVolumeFile
  );
  fastify.post<{
    Params: { Id: string };
    Body: { FilePath: string; ContentBase64: string };
  }>("/servers/:Id/files/upload", controller.UploadVolumeFile);
  fastify.post<{
    Params: { Id: string };
    Body: { Path: string };
  }>("/servers/:Id/files/mkdir", controller.CreateVolumeDirectory);
  fastify.post<{
    Params: { Id: string };
    Body: { OldPath: string; NewPath: string };
  }>("/servers/:Id/files/rename", controller.RenameVolumeFile);
  fastify.post<{
    Params: { Id: string };
    Body: { ArchivePath: string; Destination?: string };
  }>("/servers/:Id/files/extract", controller.ExtractVolumeArchive);
  fastify.post<{
    Params: { Id: string };
    Body: { Paths?: string[]; ArchiveName?: string };
  }>("/servers/:Id/files/compress", controller.CompressVolumeFiles);
  fastify.put<{
    Params: { Id: string };
    Body: { AlertWebhookUrl?: string };
  }>("/servers/:Id/alert-webhook", controller.UpdateAlertWebhook);
  fastify.post<{ Params: { Id: string } }>(
    "/servers/:Id/test-alert-webhook",
    controller.TestAlertWebhook
  );
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/backups", controller.ListBackups);
  fastify.post<{ Params: { Id: string }; Body?: { Name?: string } }>(
    "/servers/:Id/backups",
    controller.CreateBackup
  );
  fastify.post<{ Params: { Id: string; FileName: string } }>(
    "/servers/:Id/backups/:FileName/restore",
    controller.RestoreBackup
  );
  fastify.delete<{ Params: { Id: string; FileName: string } }>(
    "/servers/:Id/backups/:FileName",
    controller.DeleteBackup
  );
  fastify.get<{ Params: { Id: string; FileName: string } }>(
    "/servers/:Id/backups/:FileName/download",
    controller.DownloadBackup
  );
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/audit", controller.GetServerAuditLogs);
  fastify.post("/servers/bulk/start", controller.BulkStart);
  fastify.post("/servers/bulk/stop", controller.BulkStop);
  fastify.post("/servers/bulk/restart", controller.BulkRestart);
  fastify.post<{
    Params: { Id: string };
    Body: { HostPort: number; ContainerPort: number; Protocol: "tcp" | "udp" };
  }>("/servers/:Id/ports", controller.AddPort);
  fastify.delete<{ Params: { Id: string; ContainerPort: string; Protocol: string } }>(
    "/servers/:Id/ports/:ContainerPort/:Protocol",
    controller.RemovePort
  );
  fastify.post<{
    Params: { Id: string };
    Body: { NewName: string };
  }>("/servers/:Id/clone", controller.CloneServer);
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/schedules", controller.GetSchedules);
  fastify.post<{
    Params: { Id: string };
    Body: { Name: string; TaskType: "Backup" | "Restart" | "Command"; IntervalMinutes: number; Command?: string };
  }>("/servers/:Id/schedules", controller.CreateSchedule);
  fastify.delete<{ Params: { Id: string; ScheduleId: string } }>(
    "/servers/:Id/schedules/:ScheduleId",
    controller.DeleteSchedule
  );
  fastify.post<{ Params: { Id: string; ScheduleId: string } }>(
    "/servers/:Id/schedules/:ScheduleId/run",
    controller.RunSchedule
  );
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/webhook", controller.GetWebhook);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/webhook/rotate", controller.RotateWebhook);
  fastify.post<{ Params: { Id: string }; Body: { Command: string } }>("/servers/:Id/exec", controller.ExecuteQuickCommand);
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/export-archive", controller.ExportVolumeArchive);
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/processes", controller.GetServerProcesses);
  fastify.post<{ Params: { Id: string }; Body?: { Image?: string } }>("/servers/:Id/redeploy", controller.RedeployServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/pause", controller.PauseServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/unpause", controller.UnpauseServer);
  fastify.post<{ Params: { Id: string }; Body: { Port: number; Host?: string } }>(
    "/servers/:Id/ports/probe",
    controller.ProbeServerPort
  );
  fastify.get<{ Params: { Id: string } }>("/servers/:Id/compose", controller.GetDockerCompose);
}
