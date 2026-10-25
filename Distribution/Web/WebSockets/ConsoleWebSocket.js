import { ServerService } from "../../Core/Services/ServerService.js";
import { AuthService } from "../../Core/Services/AuthService.js";
export async function ConsoleWebSocketRoute(fastify) {
    const serverService = ServerService.GetInstance();
    const authService = AuthService.GetInstance();
    fastify.get("/ws/servers/:Id/console", { websocket: true }, async (socket, request) => {
        const origin = request.headers.origin;
        const host = request.headers.host;
        if (origin && host) {
            try {
                const originHost = new URL(origin).host;
                if (originHost !== host) {
                    socket.close(1008, "Cross-origin WebSocket rejected");
                    return;
                }
            }
            catch {
                socket.close(1008, "Invalid origin");
                return;
            }
        }
        const token = request.cookies?.["qir_session"] || request.query?.token;
        const user = token ? authService.ValidateSession(token) : null;
        if (!user) {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({
                    Type: "Error",
                    Data: "Authentication required for terminal access.",
                }));
            }
            socket.close(1008, "Unauthorized");
            return;
        }
        const serverId = request.params.Id;
        try {
            const initialLogs = await serverService.GetLogs(serverId, 100);
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({
                    Type: "History",
                    Data: initialLogs,
                }));
            }
            const cleanupStream = await serverService.StreamLogs(serverId, (chunk) => {
                if (socket.readyState === socket.OPEN) {
                    socket.send(JSON.stringify({
                        Type: "Log",
                        Data: chunk,
                    }));
                }
            });
            socket.on("message", async (rawMessage) => {
                try {
                    const text = rawMessage.toString("utf8");
                    let commandToExecute = text;
                    try {
                        const parsed = JSON.parse(text);
                        if (typeof parsed.Command === "string") {
                            commandToExecute = parsed.Command;
                        }
                        else if (parsed.Type === "Input" && typeof parsed.Data === "string") {
                            commandToExecute = parsed.Data;
                        }
                    }
                    catch { }
                    const output = await serverService.SendCommand(serverId, commandToExecute);
                    if (socket.readyState === socket.OPEN && output) {
                        socket.send(JSON.stringify({
                            Type: "Log",
                            Data: output.endsWith("\n") ? output : output + "\n",
                        }));
                    }
                }
                catch (err) {
                    if (socket.readyState === socket.OPEN) {
                        socket.send(JSON.stringify({
                            Type: "Error",
                            Data: err instanceof Error ? err.message : "Command execution failed.",
                        }));
                    }
                }
            });
            socket.on("close", () => {
                cleanupStream();
            });
            socket.on("error", () => {
                cleanupStream();
            });
        }
        catch (err) {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({
                    Type: "Error",
                    Data: err instanceof Error ? err.message : "Failed to connect to console.",
                }));
            }
            socket.close();
        }
    });
}
