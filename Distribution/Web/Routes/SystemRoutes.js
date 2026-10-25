import { SystemController } from "../Controllers/SystemController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";
export async function SystemRoutes(fastify) {
    fastify.addHook("preHandler", RequireAuth);
    const controller = new SystemController();
    fastify.get("/system/status", controller.GetSystemStatus);
    fastify.get("/system/audit", controller.GetAuditLogs);
    fastify.get("/system/audit/export", controller.ExportAuditLogs);
    fastify.get("/system/docker/df", controller.GetDockerDiskUsage);
    fastify.post("/system/docker/prune", controller.PruneDockerSystem);
}
