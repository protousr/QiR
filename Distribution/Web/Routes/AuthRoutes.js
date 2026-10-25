import { AuthController } from "../Controllers/AuthController.js";
import { RequireAuth } from "../Middleware/AuthMiddleware.js";
import { LoginRateLimiter } from "../Middleware/RateLimiter.js";
export async function AuthRoutes(fastify) {
    const controller = new AuthController();
    fastify.get("/auth/setup-status", controller.GetSetupStatus);
    fastify.post("/auth/setup", controller.SetupInitialAdmin);
    fastify.post("/auth/login", { preHandler: LoginRateLimiter.Middleware }, controller.Login);
    fastify.post("/auth/logout", controller.Logout);
    fastify.get("/auth/me", { preHandler: RequireAuth }, controller.GetCurrentUser);
    fastify.post("/auth/2fa/setup", { preHandler: RequireAuth }, controller.SetupTotp);
    fastify.post("/auth/2fa/enable", { preHandler: RequireAuth }, controller.EnableTotp);
    fastify.post("/auth/2fa/disable", { preHandler: RequireAuth }, controller.DisableTotp);
    fastify.get("/auth/sessions", { preHandler: RequireAuth }, controller.GetSessions);
    fastify.delete("/auth/sessions/:Id", { preHandler: RequireAuth }, controller.RevokeSession);
    fastify.delete("/auth/sessions", { preHandler: RequireAuth }, controller.RevokeOtherSessions);
}
