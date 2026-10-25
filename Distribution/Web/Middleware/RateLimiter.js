export class RateLimiter {
    Attempts = new Map();
    MaxAttempts;
    WindowMs;
    constructor(maxAttempts = 5, windowMs = 60000) {
        this.MaxAttempts = maxAttempts;
        this.WindowMs = windowMs;
    }
    Middleware = async (request, reply) => {
        const ip = request.ip || "unknown";
        const now = Date.now();
        const entry = this.Attempts.get(ip);
        if (entry && now < entry.ResetTime) {
            if (entry.Count >= this.MaxAttempts) {
                const retryAfterSeconds = Math.ceil((entry.ResetTime - now) / 1000);
                reply.header("Retry-After", retryAfterSeconds);
                reply.status(429).send({
                    Success: false,
                    Error: `Too many login attempts. Please wait ${retryAfterSeconds} seconds.`,
                });
                return;
            }
            entry.Count++;
        }
        else {
            this.Attempts.set(ip, {
                Count: 1,
                ResetTime: now + this.WindowMs,
            });
        }
    };
    Reset(ip) {
        this.Attempts.delete(ip);
    }
}
export const LoginRateLimiter = new RateLimiter(5, 60000);
