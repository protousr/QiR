import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
  IContainerBuildConfig,
} from "../Core/Types/TemplateTypes.js";
import type { ICreateServerInput, IPortMapping } from "../Core/Types/ServerTypes.js";

export class MinecraftTemplate extends BaseTemplate {
  public readonly Id = "minecraft-server";
  public readonly Name = "Minecraft Server";
  public readonly Description = "High-performance modular Minecraft server container supporting Paper, Fabric, Forge, and Vanilla.";
  public readonly Category: TemplateCategory = "GameServer";
  public readonly DefaultImage = "itzg/minecraft-server:latest";
  public readonly VolumeMountPath = "/data";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 25565,
      ContainerPort: 25565,
      Protocol: "tcp",
    },
  ];

  public readonly Fields: ITemplateField[] = [
    {
      Key: "EULA",
      Label: "Accept Minecraft EULA",
      DefaultValue: "TRUE",
      Required: true,
      Type: "select",
      Options: ["TRUE"],
      Description: "Required agreement to the Minecraft End User License Agreement.",
    },
    {
      Key: "TYPE",
      Label: "Server Type",
      DefaultValue: "PAPER",
      Required: true,
      Type: "select",
      Options: ["PAPER", "PURPUR", "FABRIC", "FORGE", "VANILLA", "SPIGOT"],
      Description: "Server distribution platform.",
    },
    {
      Key: "VERSION",
      Label: "Minecraft Version",
      DefaultValue: "LATEST",
      Required: true,
      Type: "text",
      Description: "Game version (e.g. 1.21, 1.20.4, or LATEST).",
    },
    {
      Key: "MEMORY",
      Label: "Allocated RAM",
      DefaultValue: "2G",
      Required: true,
      Type: "text",
      Description: "Java heap allocation (e.g. 2G, 4G, 8G).",
    },
    {
      Key: "MOTD",
      Label: "Server MOTD",
      DefaultValue: "A QiR Docker Minecraft Server",
      Required: false,
      Type: "text",
      Description: "Server description shown in the server list.",
    },
    {
      Key: "ONLINE_MODE",
      Label: "Online Mode",
      DefaultValue: "TRUE",
      Required: true,
      Type: "select",
      Options: ["TRUE", "FALSE"],
      Description: "Validate players against Mojang session servers.",
    },
    {
      Key: "DIFFICULTY",
      Label: "Difficulty",
      DefaultValue: "normal",
      Required: true,
      Type: "select",
      Options: ["peaceful", "easy", "normal", "hard"],
      Description: "Default world difficulty.",
    },
  ];

  public override BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const config = super.BuildContainerConfig(input, volumeHostPath);

    config.Env.push("ENABLE_RCON=true");
    config.Env.push("RCON_PORT=25575");
    config.Env.push("RCON_PASSWORD=qiradmin");

    return config;
  }
}
