import { AuthService } from "../../Core/Services/AuthService.js";
export async function RequireAuth(request, reply) {
    const authService = AuthService.GetInstance();
    let token = request.cookies?.["qir_session"];
    if (!token) {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7).trim();
        }
    }
    if (!token) {
        const query = request.query;
        if (query?.token) {
            token = query.token;
        }
    }
    if (!token) {
        reply.status(401).send({
            Success: false,
            Error: "Authentication required",
        });
        return;
    }
    const user = authService.ValidateSession(token);
    if (!user) {
        reply.status(401).send({
            Success: false,
            Error: "Invalid or expired session",
        });
        return;
    }
    request.User = user;
}
export async function RequireAdmin(request, reply) {
    await RequireAuth(request, reply);
    if (reply.sent)
        return;
    if (request.User?.Role !== "admin") {
        reply.status(403).send({
            Success: false,
            Error: "Administrative privileges required.",
        });
    }
}
