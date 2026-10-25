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
  public readonly Description = "Standard Node.js container with optional exposed port and persistent volume for custom web apps or APIs.";
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
      DefaultValue: "npm start",
      Required: true,
      Type: "text",
      Description: "Command to execute inside /app (e.g. npm start, node app.js).",
    },
  ];

  public override BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const config = super.BuildContainerConfig(input, volumeHostPath);
    const command = input.EnvironmentVariables?.["STARTUP_CMD"] || "npm start";

    config.Cmd = [
      "sh",
      "-c",
      `cd /app && if [ -f package.json ] && [ ! -d node_modules ]; then npm install; fi && ${command}`,
    ];

    return config;
  }
}
