import { MinecraftTemplate } from "../../Templates/MinecraftTemplate.js";
import { DiscordBotTemplate } from "../../Templates/DiscordBotTemplate.js";
import { GenericNodeTemplate } from "../../Templates/GenericNodeTemplate.js";
import { GenericPythonTemplate } from "../../Templates/GenericPythonTemplate.js";
import { PostgreSqlTemplate } from "../../Templates/PostgreSqlTemplate.js";
import { RedisTemplate } from "../../Templates/RedisTemplate.js";
import { NginxStaticTemplate } from "../../Templates/NginxStaticTemplate.js";
import { MariaDbTemplate } from "../../Templates/MariaDbTemplate.js";
import { MongoDbTemplate } from "../../Templates/MongoDbTemplate.js";
import { CustomContainerTemplate } from "../../Templates/CustomContainerTemplate.js";
export class TemplateService {
    static Instance;
    Templates = new Map();
    constructor() {
        this.RegisterBuiltinTemplates();
    }
    static GetInstance() {
        if (!TemplateService.Instance) {
            TemplateService.Instance = new TemplateService();
        }
        return TemplateService.Instance;
    }
    RegisterBuiltinTemplates() {
        this.RegisterTemplate(new MinecraftTemplate());
        this.RegisterTemplate(new DiscordBotTemplate());
        this.RegisterTemplate(new GenericNodeTemplate());
        this.RegisterTemplate(new GenericPythonTemplate());
        this.RegisterTemplate(new PostgreSqlTemplate());
        this.RegisterTemplate(new RedisTemplate());
        this.RegisterTemplate(new NginxStaticTemplate());
        this.RegisterTemplate(new MariaDbTemplate());
        this.RegisterTemplate(new MongoDbTemplate());
        this.RegisterTemplate(new CustomContainerTemplate());
    }
    RegisterTemplate(template) {
        this.Templates.set(template.Id, template);
    }
    GetTemplate(id) {
        return this.Templates.get(id);
    }
    GetAllTemplates() {
        return Array.from(this.Templates.values());
    }
}
