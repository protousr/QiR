import { ServerService } from "../../Core/Services/ServerService.js";
import { AuthService } from "../../Core/Services/AuthService.js";
export async function ConsoleWebSocketRoute(fastify) {
    const serverService = ServerService.GetInstance();
    const authService = AuthService.GetInstance();
    fastify.get("/ws/servers/:Id/console", { websocket: true }, async (socket, request) => {
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
                        if (parsed.Command) {
                            commandToExecute = parsed.Command;
                        }
                    }
                    catch {
                        commandToExecute = text;
                    }
                    const output = await serverService.SendCommand(serverId, commandToExecute);
                    if (socket.readyState === socket.OPEN && output) {
                        socket.send(JSON.stringify({
                            Type: "CommandOutput",
                            Data: output,
                        }));
                    }
                }
                catch (cmdErr) {
                    if (socket.readyState === socket.OPEN) {
                        socket.send(JSON.stringify({
                            Type: "Error",
                            Data: cmdErr instanceof Error ? cmdErr.message : "Command execution failed",
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
                    Data: err instanceof Error ? err.message : "Failed to attach console",
                }));
                socket.close();
            }
        }
    });
}
