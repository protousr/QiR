import type { FastifyInstance } from "fastify";
import { SystemController } from "../Controllers/SystemController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";

export async function SystemRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("preHandler", RequireAuth);
  const controller = new SystemController();

  fastify.get("/system/status", controller.GetSystemStatus);
  fastify.get("/system/audit", controller.GetAuditLogs);
  fastify.get("/system/audit/export", controller.ExportAuditLogs);
}
