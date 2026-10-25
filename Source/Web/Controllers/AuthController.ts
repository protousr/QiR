import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService } from "../../Core/Services/AuthService.js";
import { LoginRateLimiter } from "../Middleware/RateLimiter.js";

const LoginSchema = z.object({
  Username: z.string().min(1),
  Password: z.string().min(1),
});

const SetupSchema = z.object({
  Username: z.string().min(3).max(32),
  Password: z.string().min(8),
});

export class AuthController {
  private readonly AuthService: AuthService;

  public constructor() {
    this.AuthService = AuthService.GetInstance();
  }

  public GetSetupStatus = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const isRequired = this.AuthService.IsSetupRequired();
    reply.send({
      Success: true,
      Data: {
        SetupRequired: isRequired,
      },
    });
  };

  public SetupInitialAdmin = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const parsed = SetupSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({
        Success: false,
        Error: parsed.error.format(),
      });
      return;
    }

    try {
      const user = await this.AuthService.SetupInitialAdmin(
        parsed.data.Username,
        parsed.data.Password
      );

      const loginResult = await this.AuthService.Login(
        user.Username,
        parsed.data.Password,
        request.ip || "127.0.0.1",
        request.headers["user-agent"] || "unknown"
      );

      if (loginResult) {
        reply.setCookie("qir_session", loginResult.RawToken, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: request.protocol === "https",
          expires: new Date(loginResult.ExpiresAt),
        });

        reply.status(201).send({
          Success: true,
          Data: {
            User: {
              Id: user.Id,
              Username: user.Username,
            },
            Token: loginResult.RawToken,
          },
        });
        return;
      }

      reply.status(201).send({
        Success: true,
        Data: {
          User: {
            Id: user.Id,
            Username: user.Username,
          },
        },
      });
    } catch (err) {
      reply.status(400).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Setup failed",
      });
    }
  };

  public Login = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({
        Success: false,
        Error: parsed.error.format(),
      });
      return;
    }

    const ip = request.ip || "127.0.0.1";
    const userAgent = request.headers["user-agent"] || "unknown";

    const result = await this.AuthService.Login(
      parsed.data.Username,
      parsed.data.Password,
      ip,
      userAgent
    );

    if (!result) {
      reply.status(401).send({
        Success: false,
        Error: "Invalid username or password",
      });
      return;
    }

    LoginRateLimiter.Reset(ip);

    reply.setCookie("qir_session", result.RawToken, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: request.protocol === "https",
      expires: new Date(result.ExpiresAt),
    });

    reply.send({
      Success: true,
      Data: {
        User: {
          Id: result.User.Id,
          Username: result.User.Username,
        },
        Token: result.RawToken,
      },
    });
  };

  public Logout = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    let token = request.cookies?.["qir_session"];
    if (!token && request.headers.authorization?.startsWith("Bearer ")) {
      token = request.headers.authorization.slice(7).trim();
    }

    if (token) {
      this.AuthService.Logout(token);
    }

    reply.clearCookie("qir_session", { path: "/" });
    reply.send({
      Success: true,
      Message: "Logged out successfully",
    });
  };

  public GetCurrentUser = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({
        Success: false,
        Error: "Unauthorized",
      });
      return;
    }

    reply.send({
      Success: true,
      Data: {
        Id: request.User.Id,
        Username: request.User.Username,
        CreatedAt: request.User.CreatedAt,
      },
    });
  };
}
