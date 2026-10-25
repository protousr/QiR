import type { FastifyInstance } from "fastify";
import { SystemController } from "../Controllers/SystemController.js";

export async function SystemRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new SystemController();

  fastify.get("/system/status", controller.GetSystemStatus);
}
