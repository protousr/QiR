import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
  IContainerBuildConfig,
} from "../Core/Types/TemplateTypes.js";
import type { ICreateServerInput, IPortMapping } from "../Core/Types/ServerTypes.js";

export class DiscordBotTemplate extends BaseTemplate {
  public readonly Id = "discord-bot-node";
  public readonly Name = "Discord Bot (Node.js)";
  public readonly Description = "Containerized Node.js environment configured for 24/7 Discord bot hosting with persistent storage and auto-restart.";
  public readonly Category: TemplateCategory = "Bot";
  public readonly DefaultImage = "node:22-alpine";
  public readonly VolumeMountPath = "/app";

  public readonly DefaultPorts: IPortMapping[] = [];

  public override readonly InitialFiles: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: "discord-bot",
        version: "1.0.0",
        type: "module",
        main: "index.js",
        scripts: {
          start: "node index.js",
        },
        dependencies: {
          "discord.js": "^14.18.0",
        },
      },
      null,
      2
    ),
    "index.js": `import { Client, GatewayIntentBits } from "discord.js";\n\nconst token = process.env.DISCORD_TOKEN;\nif (!token) {\n  console.error("[QiR Bot Error] DISCORD_TOKEN environment variable is not configured!");\n  process.exit(1);\n}\n\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] });\n\nclient.once("ready", () => {\n  console.log(\`[QiR Bot] Logged in successfully as \${client.user.tag}!\`);\n});\n\nclient.login(token).catch((err) => {\n  console.error("[QiR Bot Error] Failed to log in to Discord:", err.message);\n});\n`,
  };

  public readonly Fields: ITemplateField[] = [
    {
      Key: "DISCORD_TOKEN",
      Label: "Discord Bot Token",
      DefaultValue: "",
      Required: true,
      Type: "password",
      Description: "Your Discord bot authorization token from Discord Developer Portal.",
    },
    {
      Key: "CLIENT_ID",
      Label: "Application / Client ID",
      DefaultValue: "",
      Required: false,
      Type: "text",
      Description: "Your Discord bot application ID.",
    },
    {
      Key: "ENTRY_FILE",
      Label: "Entry Script",
      DefaultValue: "index.js",
      Required: true,
      Type: "text",
      Description: "Main execution file inside the /app volume (e.g. index.js, bot.js).",
    },
    {
      Key: "AUTO_NPM_INSTALL",
      Label: "Auto Run npm install",
      DefaultValue: "true",
      Required: false,
      Type: "select",
      Options: ["true", "false"],
      Description: "Automatically run npm install before starting if package.json exists.",
    },
  ];

  public override BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const config = super.BuildContainerConfig(input, volumeHostPath);

    const entryFile = input.EnvironmentVariables?.["ENTRY_FILE"] || "index.js";
    const autoInstall = input.EnvironmentVariables?.["AUTO_NPM_INSTALL"] !== "false";

    let startupCommand: string;
    if (autoInstall) {
      startupCommand = `cd /app && if [ -f package.json ] && [ ! -d node_modules ]; then npm install; fi && if [ -f ${entryFile} ]; then node ${entryFile}; else echo "Waiting for bot files in /app..."; tail -f /dev/null; fi`;
    } else {
      startupCommand = `cd /app && if [ -f ${entryFile} ]; then node ${entryFile}; else echo "Waiting for bot files in /app..."; tail -f /dev/null; fi`;
    }

    config.Cmd = ["sh", "-c", startupCommand];

    return config;
  }
}
