import type { FastifyInstance } from "fastify";
import { TemplateController } from "../Controllers/TemplateController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";

export async function TemplateRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("preHandler", RequireAuth);
  const controller = new TemplateController();

  fastify.get("/templates", controller.GetAllTemplates);
  fastify.get<{ Params: { Id: string } }>("/templates/:Id", controller.GetTemplateById);
}
