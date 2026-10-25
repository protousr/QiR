import type { FastifyInstance, FastifyRequest } from "fastify";
import type WebSocket from "ws";
import { ServerService } from "../../Core/Services/ServerService.js";
import { AuthService } from "../../Core/Services/AuthService.js";
import type { IServerStats } from "../../Core/Types/ServerTypes.js";

export async function StatsWebSocketRoute(fastify: FastifyInstance): Promise<void> {
  const serverService = ServerService.GetInstance();
  const authService = AuthService.GetInstance();

  fastify.get<{ Params: { Id: string }; Querystring: { token?: string } }>(
    "/ws/servers/:Id/stats",
    { websocket: true },
    async (
      socket: WebSocket,
      request: FastifyRequest<{ Params: { Id: string }; Querystring: { token?: string } }>
    ) => {
      const origin = request.headers.origin;
      const host = request.headers.host;
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            socket.close(1008, "Cross-origin WebSocket rejected");
            return;
          }
        } catch {
          socket.close(1008, "Invalid origin");
          return;
        }
      }

      const token = request.cookies?.["qir_session"] || request.query?.token;
      const user = token ? authService.ValidateSession(token) : null;

      if (!user) {
        if (socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({
              Type: "Error",
              Data: "Authentication required for stats stream.",
            })
          );
        }
        socket.close(1008, "Unauthorized");
        return;
      }

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
              Data: err instanceof Error ? err.message : "Failed to connect to stats.",
            })
          );
        }
        socket.close();
      }
    }
  );
}
