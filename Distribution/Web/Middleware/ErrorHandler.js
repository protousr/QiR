export function GlobalErrorHandler(error, request, reply) {
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
        Success: false,
        Error: {
            Code: error.code || "INTERNAL_ERROR",
            Message: error.message || "An unexpected error occurred",
        },
    });
}
