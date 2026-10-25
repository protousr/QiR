import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../../Core/Services/AuthService.js";
import type { IUserRecord } from "../../Core/Database/DatabaseManager.js";

declare module "fastify" {
  interface FastifyRequest {
    User?: IUserRecord;
  }
}

export async function RequireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authService = AuthService.GetInstance();

  let token = request.cookies?.["qir_session"];

  if (!token) {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    const query = request.query as { token?: string } | undefined;
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
