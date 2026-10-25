import { TemplateController } from "../Controllers/TemplateController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";
export async function TemplateRoutes(fastify) {
    fastify.addHook("preHandler", RequireAuth);
    const controller = new TemplateController();
    fastify.get("/templates", controller.GetAllTemplates);
    fastify.get("/templates/:Id", controller.GetTemplateById);
}
