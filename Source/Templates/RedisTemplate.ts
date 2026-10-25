import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
  IContainerBuildConfig,
} from "../Core/Types/TemplateTypes.js";
import type { ICreateServerInput, IPortMapping } from "../Core/Types/ServerTypes.js";

export class RedisTemplate extends BaseTemplate {
  public readonly Id = "redis-cache";
  public readonly Name = "Redis In-Memory Cache";
  public readonly Description = "Blazing fast in-memory key-value data structure store with persistence and optional authentication.";
  public readonly Category: TemplateCategory = "Database";
  public readonly DefaultImage = "redis:7-alpine";
  public readonly VolumeMountPath = "/data";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 6379,
      ContainerPort: 6379,
      Protocol: "tcp",
    },
  ];

  public readonly Fields: ITemplateField[] = [
    {
      Key: "REDIS_PASSWORD",
      Label: "Redis Password (Optional)",
      DefaultValue: "",
      Required: false,
      Type: "password",
      Description: "Require client authentication via AUTH command if set.",
    },
  ];

  public override BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const config = super.BuildContainerConfig(input, volumeHostPath);
    const pass = input.EnvironmentVariables?.["REDIS_PASSWORD"];

    if (pass) {
      config.Cmd = ["redis-server", "--requirepass", pass, "--appendonly", "yes"];
    } else {
      config.Cmd = ["redis-server", "--appendonly", "yes"];
    }

    return config;
  }
}