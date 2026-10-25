import type { FastifyInstance, FastifyRequest } from "fastify";
import type WebSocket from "ws";
import { ServerService } from "../../Core/Services/ServerService.js";
import type { IServerStats } from "../../Core/Types/ServerTypes.js";

export async function StatsWebSocketRoute(fastify: FastifyInstance): Promise<void> {
  const serverService = ServerService.GetInstance();

  fastify.get<{ Params: { Id: string } }>(
    "/ws/servers/:Id/stats",
    { websocket: true },
    async (socket: WebSocket, request: FastifyRequest<{ Params: { Id: string } }>) => {
      const serverId = request.params.Id;

      try {
        const cleanupStats = await serverService.StreamStats(
          serverId,
          (stats: IServerStats) => {
            if (socket.readyState === socket.OPEN) {
              socket.send(
                JSON.stringify({
                  Type: "Stats",
                  Data: stats,
                })
              );
            }
          }
        );

        socket.on("close", () => {
          cleanupStats();
        });

        socket.on("error", () => {
          cleanupStats();
        });
      } catch (err) {
        if (socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({
              Type: "Error",
              Data: err instanceof Error ? err.message : "Failed to attach stats monitor",
            })
          );
          socket.close();
        }
      }
    }
  );
}
