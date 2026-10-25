import type { FastifyReply, FastifyRequest } from "fastify";

interface IRateLimitEntry {
  Count: number;
  ResetTime: number;
}

export class RateLimiter {
  private readonly Attempts: Map<string, IRateLimitEntry> = new Map();
  private readonly MaxAttempts: number;
  private readonly WindowMs: number;

  public constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.MaxAttempts = maxAttempts;
    this.WindowMs = windowMs;
  }

  public Middleware = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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
    } else {
      this.Attempts.set(ip, {
        Count: 1,
        ResetTime: now + this.WindowMs,
      });
    }
  };

  public Reset(ip: string): void {
    this.Attempts.delete(ip);
  }
}

export const LoginRateLimiter = new RateLimiter(5, 60000);
