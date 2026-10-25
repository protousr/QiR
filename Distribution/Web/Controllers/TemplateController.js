import { TemplateService } from "../../Core/Services/TemplateService.js";
export class TemplateController {
    TemplateService;
    constructor() {
        this.TemplateService = TemplateService.GetInstance();
    }
    GetAllTemplates = async (request, reply) => {
        const templates = this.TemplateService.GetAllTemplates();
        reply.send({ Success: true, Data: templates });
    };
    GetTemplateById = async (request, reply) => {
        const template = this.TemplateService.GetTemplate(request.params.Id);
        if (!template) {
            reply.status(404).send({ Success: false, Error: "Template not found" });
            return;
        }
        reply.send({ Success: true, Data: template });
    };
}
