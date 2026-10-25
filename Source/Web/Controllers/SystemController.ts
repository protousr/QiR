import type { FastifyReply, FastifyRequest } from "fastify";
import os from "node:os";
import { DockerClient } from "../../Core/Docker/DockerClient.js";
import { DatabaseManager } from "../../Core/Database/DatabaseManager.js";

export class SystemController {
  private readonly DockerClient: DockerClient;
  private readonly DatabaseManager: DatabaseManager;

  public constructor() {
    this.DockerClient = DockerClient.GetInstance();
    this.DatabaseManager = DatabaseManager.GetInstance();
  }

  public GetSystemStatus = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const isDockerAvailable = await this.DockerClient.Ping();

    let dockerVersion: unknown = null;
    if (isDockerAvailable) {
      try {
        dockerVersion = await this.DockerClient.GetVersion();
      } catch {
        dockerVersion = null;
      }
    }

    reply.send({
      Success: true,
      Data: {
        NodeVersion: process.version,
        Platform: os.platform(),
        Architecture: os.arch(),
        TotalMemoryBytes: os.totalmem(),
        FreeMemoryBytes: os.freemem(),
        CpuCount: os.cpus().length,
        DockerConnected: isDockerAvailable,
        DockerVersion: dockerVersion,
        UptimeSeconds: process.uptime(),
      },
    });
  };

  public GetAuditLogs = async (
    request: FastifyRequest<{ Querystring: { Action?: string; Limit?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const action = request.query?.Action;
    const limit = request.query?.Limit ? parseInt(request.query.Limit, 10) : 50;
    const logs = this.DatabaseManager.GetFilteredAuditLogs(action, limit);
    reply.send({ Success: true, Data: logs });
  };

  public ExportAuditLogs = async (
    request: FastifyRequest<{ Querystring: { Format?: string; Action?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const queryObj = request.query as Record<string, string | undefined>;
    const action = queryObj?.Action || queryObj?.action;
    const format = (queryObj?.Format || queryObj?.format || "csv").toLowerCase();
    const logs = this.DatabaseManager.GetFilteredAuditLogs(action, 1000);

    if (format === "json") {
      reply.header("Content-Type", "application/json");
      reply.header("Content-Disposition", 'attachment; filename="qir-audit-logs.json"');
      reply.send(JSON.stringify(logs, null, 2));
      return;
    }

    const headers = ["Id", "Timestamp", "Action", "IpAddress", "Details"];
    const rows = logs.map((log) => [
      log.Id,
      log.Timestamp,
      log.Action,
      log.IpAddress || "",
      `"${(log.Details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", 'attachment; filename="qir-audit-logs.csv"');
    reply.send(csvContent);
  };
}
