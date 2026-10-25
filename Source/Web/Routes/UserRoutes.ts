import type { FastifyInstance } from "fastify";
import { UserController } from "../Controllers/UserController.js";
import { RequireAdmin } from "../Middleware/AuthMiddleware.js";

export async function UserRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("preHandler", RequireAdmin);
  const controller = new UserController();

  fastify.get("/users", controller.GetAllUsers);
  fastify.post("/users", controller.CreateUser);
  fastify.delete<{ Params: { Id: string } }>("/users/:Id", controller.DeleteUser);
  fastify.get<{ Params: { Id: string } }>("/users/:Id/servers", controller.GetUserServers);
}
