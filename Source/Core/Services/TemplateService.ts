import type { ITemplate } from "../Types/TemplateTypes.js";
import { MinecraftTemplate } from "../../Templates/MinecraftTemplate.js";
import { DiscordBotTemplate } from "../../Templates/DiscordBotTemplate.js";
import { GenericNodeTemplate } from "../../Templates/GenericNodeTemplate.js";
import { GenericPythonTemplate } from "../../Templates/GenericPythonTemplate.js";

export class TemplateService {
  private static Instance: TemplateService;
  private readonly Templates: Map<string, ITemplate> = new Map();

  private constructor() {
    this.RegisterBuiltinTemplates();
  }

  public static GetInstance(): TemplateService {
    if (!TemplateService.Instance) {
      TemplateService.Instance = new TemplateService();
    }
    return TemplateService.Instance;
  }

  private RegisterBuiltinTemplates(): void {
    this.RegisterTemplate(new MinecraftTemplate());
    this.RegisterTemplate(new DiscordBotTemplate());
    this.RegisterTemplate(new GenericNodeTemplate());
    this.RegisterTemplate(new GenericPythonTemplate());
  }

  public RegisterTemplate(template: ITemplate): void {
    this.Templates.set(template.Id, template);
  }

  public GetTemplate(id: string): ITemplate | undefined {
    return this.Templates.get(id);
  }

  public GetAllTemplates(): ITemplate[] {
    return Array.from(this.Templates.values());
  }
}
