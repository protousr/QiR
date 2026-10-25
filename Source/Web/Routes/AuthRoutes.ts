import type { FastifyInstance } from "fastify";
import { AuthController } from "../Controllers/AuthController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";
import { LoginRateLimiter } from "../Middleware/RateLimiter.js";

export async function AuthRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new AuthController();

  fastify.get("/auth/setup-status", controller.GetSetupStatus);
  fastify.post("/auth/setup", controller.SetupInitialAdmin);
  fastify.post("/auth/login", { preHandler: LoginRateLimiter.Middleware }, controller.Login);
  fastify.post("/auth/logout", controller.Logout);
  fastify.get("/auth/me", { preHandler: RequireAuth }, controller.GetCurrentUser);
}
