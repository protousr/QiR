import fastify, { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { AuthRoutes } from "./Web/Routes/AuthRoutes.js";
import { ServerRoutes } from "./Web/Routes/ServerRoutes.js";
import { TemplateRoutes } from "./Web/Routes/TemplateRoutes.js";
import { SystemRoutes } from "./Web/Routes/SystemRoutes.js";
import { UserRoutes } from "./Web/Routes/UserRoutes.js";
import { ConsoleWebSocketRoute } from "./Web/WebSockets/ConsoleWebSocket.js";
import { StatsWebSocketRoute } from "./Web/WebSockets/StatsWebSocket.js";
import { GlobalErrorHandler } from "./Web/Middleware/ErrorHandler.js";
import { ConfigInstance } from "./Config/EnvironmentConfig.js";

export async function BuildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: ConfigInstance.LogLevel,
    },
    trustProxy: ConfigInstance.TrustProxy,
  });

  app.setErrorHandler(GlobalErrorHandler);

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyCookie, {
    secret: ConfigInstance.MasterKey,
  });

  await app.register(fastifyWebsocket);

  const distPublic = path.resolve(process.cwd(), "Distribution", "Public");
  const srcPublic = path.resolve(process.cwd(), "Source", "Public");
  const publicPath = fs.existsSync(distPublic) ? distPublic : srcPublic;

  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: "/",
  });

  await app.register(
    async (api) => {
      await api.register(AuthRoutes);
      await api.register(ServerRoutes);
      await api.register(TemplateRoutes);
      await api.register(SystemRoutes);
      await api.register(UserRoutes);
    },
    { prefix: "/api" }
  );

  await app.register(ConsoleWebSocketRoute);
  await app.register(StatsWebSocketRoute);

  return app;
}
