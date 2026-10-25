import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService } from "../../Core/Services/AuthService.js";
import { ServerService } from "../../Core/Services/ServerService.js";

const CreateUserSchema = z.object({
  Username: z.string().min(3).max(32),
  Password: z.string().min(8),
  Role: z.enum(["admin", "user"]).default("user"),
});

export class UserController {
  private readonly AuthService: AuthService;
  private readonly ServerService: ServerService;

  public constructor() {
    this.AuthService = AuthService.GetInstance();
    this.ServerService = ServerService.GetInstance();
  }

  public GetAllUsers = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const users = this.AuthService.GetAllUsers();
    const allServers = await this.ServerService.GetAllServers();

    const sanitized = users.map((u) => {
      const userServers = allServers.filter((s) => s.OwnerId === u.Id);
      return {
        Id: u.Id,
        Username: u.Username,
        Role: u.Role || "user",
        CreatedAt: u.CreatedAt,
        ServerCount: userServers.length,
      };
    });

    reply.send({ Success: true, Data: sanitized });
  };

  public CreateUser = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const parsed = CreateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({
        Success: false,
        Error: parsed.error.format(),
      });
      return;
    }

    try {
      const user = await this.AuthService.CreateUser(
        parsed.data.Username,
        parsed.data.Password,
        parsed.data.Role
      );

      reply.status(201).send({
        Success: true,
        Data: {
          Id: user.Id,
          Username: user.Username,
          Role: user.Role,
          CreatedAt: user.CreatedAt,
        },
      });
    } catch (err) {
      reply.status(400).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to create user",
      });
    }
  };

  public DeleteUser = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const targetUserId = request.params.Id;

    if (request.User?.Id === targetUserId) {
      reply.status(400).send({
        Success: false,
        Error: "You cannot delete your own administrative account.",
      });
      return;
    }

    try {
      this.AuthService.DeleteUser(targetUserId);
      reply.send({ Success: true, Message: "User deleted successfully" });
    } catch (err) {
      reply.status(400).send({
        Success: false,
        Error: err instanceof Error ? err.message : "Failed to delete user",
      });
    }
  };

  public GetUserServers = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const servers = await this.ServerService.GetServersByOwner(request.params.Id);
    reply.send({ Success: true, Data: servers });
  };
}
