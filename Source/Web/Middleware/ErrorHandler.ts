import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function GlobalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    Success: false,
    Error: {
      Code: error.code || "INTERNAL_ERROR",
      Message: error.message || "An unexpected error occurred",
    },
  });
}
