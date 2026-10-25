import { BaseTemplate } from "./BaseTemplate.js";
export class NginxStaticTemplate extends BaseTemplate {
    Id = "nginx-static-web";
    Name = "Nginx Web Server";
    Description = "High-performance web server configured for serving static websites, single page applications, or assets.";
    Category = "Web";
    DefaultImage = "nginx:alpine";
    VolumeMountPath = "/usr/share/nginx/html";
    DefaultPorts = [
        {
            HostPort: 8080,
            ContainerPort: 80,
            Protocol: "tcp",
        },
    ];
    InitialFiles = {
        "index.html": `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>QiR Web Host</title>\n  <style>\n    body { background-color: #0b0c10; color: #eceef2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n    .box { text-align: center; border: 1px solid rgba(255,255,255,0.1); padding: 2rem 3rem; border-radius: 12px; background: #161820; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }\n    h1 { margin-top: 0; font-size: 1.5rem; color: #5e6ad2; }\n    p { margin-bottom: 0; color: #9297a6; font-size: 0.9rem; }\n  </style>\n</head>\n<body>\n  <div class="box">\n    <h1>QiR Web Workload</h1>\n    <p>Nginx static server is online and serving files from container volume.</p>\n  </div>\n</body>\n</html>\n`,
    };
    Fields = [];
}
