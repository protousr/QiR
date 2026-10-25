import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
  IContainerBuildConfig,
} from "../Core/Types/TemplateTypes.js";
import type { ICreateServerInput, IPortMapping } from "../Core/Types/ServerTypes.js";

export class GenericNodeTemplate extends BaseTemplate {
  public readonly Id = "generic-node";
  public readonly Name = "Node.js Application";
  public readonly Description = "Standard Node.js container with optional exposed port, pre-configured package.json starter, and persistent volume.";
  public readonly Category: TemplateCategory = "Runtime";
  public readonly DefaultImage = "node:22-alpine";
  public readonly VolumeMountPath = "/app";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 3000,
      ContainerPort: 3000,
      Protocol: "tcp",
    },
  ];

  public override readonly InitialFiles: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: "node-app",
        version: "1.0.0",
        type: "module",
        main: "index.js",
        scripts: {
          start: "node index.js",
        },
      },
      null,
      2
    ),
    "index.js": `import http from "node:http";\n\nconst port = process.env.PORT || 3000;\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ status: "online", message: "QiR Node.js Workload Running" }));\n});\n\nserver.listen(port, "0.0.0.0", () => {\n  console.log(\`[QiR] Server listening on port \${port}\`);\n});\n`,
  };

  public readonly Fields: ITemplateField[] = [
    {
      Key: "NODE_ENV",
      Label: "Node Environment",
      DefaultValue: "production",
      Required: false,
      Type: "select",
      Options: ["production", "development"],
      Description: "Runtime environment flag.",
    },
    {
      Key: "STARTUP_CMD",
      Label: "Startup Command",
      DefaultValue: "node index.js",
      Required: true,
      Type: "text",
      Description: "Execution command inside /app (e.g. node index.js, npm start).",
    },
  ];

  public override BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const config = super.BuildContainerConfig(input, volumeHostPath);
    const command = input.EnvironmentVariables?.["STARTUP_CMD"] || "node index.js";

    config.Cmd = [
      "sh",
      "-c",
      `cd /app && if [ -f package.json ] && [ ! -d node_modules ]; then npm install; fi && ${command}`,
    ];

    return config;
  }
}
