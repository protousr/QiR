import type { FastifyInstance } from "fastify";
import { TemplateController } from "../Controllers/TemplateController.js";

export async function TemplateRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new TemplateController();

  fastify.get("/templates", controller.GetAllTemplates);
  fastify.get<{ Params: { Id: string } }>("/templates/:Id", controller.GetTemplateById);
}
