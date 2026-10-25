import { UserController } from "../Controllers/UserController.js";
import { RequireAdmin } from "../Middleware/AuthMiddleware.js";
export async function UserRoutes(fastify) {
    fastify.addHook("preHandler", RequireAdmin);
    const controller = new UserController();
    fastify.get("/users", controller.GetAllUsers);
    fastify.post("/users", controller.CreateUser);
    fastify.delete("/users/:Id", controller.DeleteUser);
    fastify.get("/users/:Id/servers", controller.GetUserServers);
}
