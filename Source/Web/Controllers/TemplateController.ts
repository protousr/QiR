import type { FastifyReply, FastifyRequest } from "fastify";
import { TemplateService } from "../../Core/Services/TemplateService.js";

export class TemplateController {
  private readonly TemplateService: TemplateService;

  public constructor() {
    this.TemplateService = TemplateService.GetInstance();
  }

  public GetAllTemplates = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const templates = this.TemplateService.GetAllTemplates();
    reply.send({ Success: true, Data: templates });
  };

  public GetTemplateById = async (
    request: FastifyRequest<{ Params: { Id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const template = this.TemplateService.GetTemplate(request.params.Id);
    if (!template) {
      reply.status(404).send({ Success: false, Error: "Template not found" });
      return;
    }
    reply.send({ Success: true, Data: template });
  };
}
