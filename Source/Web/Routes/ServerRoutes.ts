import type { FastifyInstance } from "fastify";
import { ServerController } from "../Controllers/ServerController.js";

export async function ServerRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new ServerController();

  fastify.get("/servers", controller.GetAllServers);
  fastify.get<{ Params: { Id: string } }>("/servers/:Id", controller.GetServerById);
  fastify.post("/servers", controller.CreateServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/start", controller.StartServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/stop", controller.StopServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/restart", controller.RestartServer);
  fastify.delete<{ Params: { Id: string } }>("/servers/:Id", controller.DeleteServer);
  fastify.post<{ Params: { Id: string } }>("/servers/:Id/command", controller.SendCommand);
  fastify.get<{ Params: { Id: string }; Querystring: { Tail?: string } }>(
    "/servers/:Id/logs",
    controller.GetLogs
  );
  fastify.get<{ Params: { Id: string }; Querystring: { SubPath?: string } }>(
    "/servers/:Id/files",
    controller.ListVolumeFiles
  );
  fastify.get<{ Params: { Id: string }; Querystring: { FilePath: string } }>(
    "/servers/:Id/files/content",
    controller.ReadVolumeFile
  );
  fastify.post<{
    Params: { Id: string };
    Body: { FilePath: string; Content: string };
  }>("/servers/:Id/files/content", controller.WriteVolumeFile);
}
