import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService } from "../../Core/Services/AuthService.js";
import { LoginRateLimiter } from "../Middleware/RateLimiter.js";

const LoginSchema = z.object({
  Username: z.string().min(1),
  Password: z.string().min(1),
  TotpCode: z.string().optional(),
});

const SetupSchema = z.object({
  Username: z.string().min(3).max(32),
  Password: z.string().min(8),
});

const TotpVerifySchema = z.object({
  Token: z.string().length(6),
});

const TotpDisableSchema = z.object({
  Password: z.string().min(1),
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

      if (loginResult && loginResult.RawToken && loginResult.ExpiresAt) {
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
              Role: user.Role,
              TotpEnabled: Boolean(user.TotpEnabled),
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
            Role: user.Role,
            TotpEnabled: Boolean(user.TotpEnabled),
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
      userAgent,
      parsed.data.TotpCode
    );

    if (!result) {
      reply.status(401).send({
        Success: false,
        Error: "Invalid credentials or two-factor code",
      });
      return;
    }

    if (result.RequiresTotp) {
      reply.send({
        Success: true,
        Data: {
          RequiresTotp: true,
        },
      });
      return;
    }

    if (!result.User || !result.RawToken || !result.ExpiresAt) {
      reply.status(401).send({
        Success: false,
        Error: "Authentication failed",
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
          Role: result.User.Role,
          TotpEnabled: Boolean(result.User.TotpEnabled),
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
        Role: request.User.Role,
        CreatedAt: request.User.CreatedAt,
        TotpEnabled: Boolean(request.User.TotpEnabled),
      },
    });
  };

  public SetupTotp = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({ Success: false, Error: "Unauthorized" });
      return;
    }

    try {
      const data = this.AuthService.SetupTotp(request.User.Id);
      reply.send({ Success: true, Data: data });
    } catch (err) {
      reply.status(500).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to setup 2FA",
      });
    }
  };

  public EnableTotp = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({ Success: false, Error: "Unauthorized" });
      return;
    }

    const parsed = TotpVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ Success: false, Error: "6-digit code required" });
      return;
    }

    const success = this.AuthService.VerifyAndEnableTotp(request.User.Id, parsed.data.Token);
    if (!success) {
      reply.status(400).send({ Success: false, Error: "Invalid verification code" });
      return;
    }

    reply.send({ Success: true, Message: "Two-factor authentication enabled successfully" });
  };

  public DisableTotp = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({ Success: false, Error: "Unauthorized" });
      return;
    }

    const parsed = TotpDisableSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ Success: false, Error: "Password required" });
      return;
    }

    const success = await this.AuthService.DisableTotp(request.User.Id, parsed.data.Password);
    if (!success) {
      reply.status(400).send({ Success: false, Error: "Invalid password" });
      return;
    }

    reply.send({ Success: true, Message: "Two-factor authentication disabled" });
  };

  public GetSessions = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({ Success: false, Error: "Unauthorized" });
      return;
    }

    let token = request.cookies?.["qir_session"];
    if (!token && request.headers.authorization?.startsWith("Bearer ")) {
      token = request.headers.authorization.slice(7).trim();
    }

    const sessions = this.AuthService.GetActiveSessions(request.User.Id, token);
    reply.send({ Success: true, Data: sessions });
  };

  public RevokeSession = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({ Success: false, Error: "Unauthorized" });
      return;
    }

    this.AuthService.RevokeSession(request.params.Id);
    reply.send({ Success: true, Message: "Session revoked successfully" });
  };

  public RevokeOtherSessions = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.User) {
      reply.status(401).send({ Success: false, Error: "Unauthorized" });
      return;
    }

    let token = request.cookies?.["qir_session"];
    if (!token && request.headers.authorization?.startsWith("Bearer ")) {
      token = request.headers.authorization.slice(7).trim();
    }

    if (token) {
      this.AuthService.RevokeOtherSessions(request.User.Id, token);
    }

    reply.send({ Success: true, Message: "All other sessions revoked" });
  };
}
