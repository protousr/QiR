import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
} from "../Core/Types/TemplateTypes.js";
import type { IPortMapping } from "../Core/Types/ServerTypes.js";

export class NginxStaticTemplate extends BaseTemplate {
  public readonly Id = "nginx-static-web";
  public readonly Name = "Nginx Web Server";
  public readonly Description = "High-performance web server configured for serving static websites, single page applications, or assets.";
  public readonly Category: TemplateCategory = "Web";
  public readonly DefaultImage = "nginx:alpine";
  public readonly VolumeMountPath = "/usr/share/nginx/html";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 8080,
      ContainerPort: 80,
      Protocol: "tcp",
    },
  ];

  public override readonly InitialFiles: Record<string, string> = {
    "index.html": `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>QiR Web Host</title>\n  <style>\n    body { background-color: #0b0c10; color: #eceef2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n    .box { text-align: center; border: 1px solid rgba(255,255,255,0.1); padding: 2rem 3rem; border-radius: 12px; background: #161820; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }\n    h1 { margin-top: 0; font-size: 1.5rem; color: #5e6ad2; }\n    p { margin-bottom: 0; color: #9297a6; font-size: 0.9rem; }\n  </style>\n</head>\n<body>\n  <div class="box">\n    <h1>QiR Web Workload</h1>\n    <p>Nginx static server is online and serving files from container volume.</p>\n  </div>\n</body>\n</html>\n`,
  };

  public readonly Fields: ITemplateField[] = [];
}