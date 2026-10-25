import { BaseTemplate } from "./BaseTemplate.js";
export class RedisTemplate extends BaseTemplate {
    Id = "redis-cache";
    Name = "Redis In-Memory Cache";
    Description = "Blazing fast in-memory key-value data structure store with persistence and optional authentication.";
    Category = "Database";
    DefaultImage = "redis:7-alpine";
    VolumeMountPath = "/data";
    DefaultPorts = [
        {
            HostPort: 6379,
            ContainerPort: 6379,
            Protocol: "tcp",
        },
    ];
    Fields = [
        {
            Key: "REDIS_PASSWORD",
            Label: "Redis Password (Optional)",
            DefaultValue: "",
            Required: false,
            Type: "password",
            Description: "Require client authentication via AUTH command if set.",
        },
    ];
    BuildContainerConfig(input, volumeHostPath) {
        const config = super.BuildContainerConfig(input, volumeHostPath);
        const pass = input.EnvironmentVariables?.["REDIS_PASSWORD"];
        if (pass) {
            config.Cmd = ["redis-server", "--requirepass", pass, "--appendonly", "yes"];
        }
        else {
            config.Cmd = ["redis-server", "--appendonly", "yes"];
        }
        return config;
    }
}
