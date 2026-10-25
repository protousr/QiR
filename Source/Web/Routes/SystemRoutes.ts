import type { FastifyInstance } from "fastify";
import { SystemController } from "../Controllers/SystemController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";

export async function SystemRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("preHandler", RequireAuth);
  const controller = new SystemController();

  fastify.get("/system/status", controller.GetSystemStatus);
  fastify.get("/system/audit", controller.GetAuditLogs);
  fastify.get("/system/audit/export", controller.ExportAuditLogs);
  fastify.get("/system/docker/df", controller.GetDockerDiskUsage);
  fastify.post<{ Body: { Target: "images" | "containers" | "volumes" | "builder" | "all" } }>(
    "/system/docker/prune",
    controller.PruneDockerSystem
  );
  fastify.get("/system/banner", controller.GetAnnouncementBanner);
  fastify.post<{ Body: { Enabled: boolean; Message: string; Type: "info" | "warning" | "danger" | "success" } }>(
    "/system/banner",
    controller.SetAnnouncementBanner
  );
}
