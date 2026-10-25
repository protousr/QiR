import type { FastifyReply, FastifyRequest } from "fastify";
import os from "node:os";
import crypto from "node:crypto";
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

  public GetDockerDiskUsage = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const docker = this.DockerClient.GetDocker();
      const df = await docker.df();
      reply.send({
        Success: true,
        Data: {
          LayersSize: df.LayersSize || 0,
          ImagesCount: df.Images ? df.Images.length : 0,
          ContainersCount: df.Containers ? df.Containers.length : 0,
          VolumesCount: df.Volumes ? df.Volumes.length : 0,
          BuildCacheSize: (df.BuildCache || []).reduce((acc: number, item: { Size?: number }) => acc + (item.Size || 0), 0),
        },
      });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to fetch Docker disk usage",
      });
    }
  };

  public PruneDockerSystem = async (
    request: FastifyRequest<{ Body: { Target: "images" | "containers" | "volumes" | "builder" | "all" } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const target = request.body?.Target || "all";
      const docker = this.DockerClient.GetDocker();
      let reclaimed = 0;
      let details = "";

      if (target === "images" || target === "all") {
        const res = await docker.pruneImages({ all: true });
        reclaimed += res.SpaceReclaimed || 0;
        details += `Images pruned (${res.ImagesDeleted?.length || 0} deleted). `;
      }
      if (target === "containers" || target === "all") {
        const res = await docker.pruneContainers();
        reclaimed += res.SpaceReclaimed || 0;
        details += `Containers pruned (${res.ContainersDeleted?.length || 0} deleted). `;
      }
      if (target === "volumes" || target === "all") {
        const res = await docker.pruneVolumes();
        reclaimed += res.SpaceReclaimed || 0;
        details += `Volumes pruned (${res.VolumesDeleted?.length || 0} deleted). `;
      }
      if (target === "builder" || target === "all") {
        const res = await docker.pruneBuilder();
        reclaimed += res.SpaceReclaimed || 0;
        details += "Build cache pruned. ";
      }

      this.DatabaseManager.LogAudit({
        Id: crypto.randomUUID(),
        Timestamp: new Date().toISOString(),
        Action: "DOCKER_SYSTEM_PRUNE",
        IpAddress: request.ip || "127.0.0.1",
        Details: `Docker system prune executed (${target}). Space reclaimed: ${(reclaimed / (1024 * 1024)).toFixed(2)} MB.`,
      });

      reply.send({
        Success: true,
        Data: {
          SpaceReclaimedBytes: reclaimed,
          Details: details.trim(),
        },
        Message: `Pruned successfully. Reclaimed ${(reclaimed / (1024 * 1024)).toFixed(2)} MB.`,
      });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Docker prune failed",
      });
    }
  };
}
