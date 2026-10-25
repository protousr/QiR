import { BaseTemplate } from "./BaseTemplate.js";
export class CustomContainerTemplate extends BaseTemplate {
    Id = "custom-docker";
    Name = "Custom Docker Image";
    Description = "Deploy any custom Docker image from Docker Hub, GHCR, or private registries with custom ports and commands.";
    Category = "Custom";
    DefaultImage = "alpine:latest";
    VolumeMountPath = "/data";
    DefaultPorts = [
        {
            HostPort: 8080,
            ContainerPort: 80,
            Protocol: "tcp",
        },
    ];
    Fields = [
        {
            Key: "DOCKER_IMAGE",
            Label: "Docker Image & Tag",
            DefaultValue: "alpine:latest",
            Required: true,
            Type: "text",
            Description: "Docker Hub or container registry image reference (e.g. grafana/grafana:latest, rabbitmq:management).",
        },
        {
            Key: "CONTAINER_CMD",
            Label: "Command / Entrypoint Args",
            DefaultValue: "",
            Required: false,
            Type: "text",
            Description: "Command arguments to run inside container (space separated, e.g. sh -c 'while true; do sleep 30; done').",
        },
        {
            Key: "VOLUME_PATH",
            Label: "Container Mount Path",
            DefaultValue: "/data",
            Required: false,
            Type: "text",
            Description: "Absolute path inside the container where persistent data volume will be mounted.",
        },
    ];
    BuildContainerConfig(input, volumeHostPath) {
        const customMount = input.EnvironmentVariables?.["VOLUME_PATH"]?.trim();
        if (customMount) {
            Object.defineProperty(this, "VolumeMountPath", {
                value: customMount,
                writable: true,
                configurable: true,
            });
        }
        const config = super.BuildContainerConfig(input, volumeHostPath);
        const customImage = input.EnvironmentVariables?.["DOCKER_IMAGE"]?.trim();
        if (customImage) {
            config.Image = customImage;
        }
        const customCmd = input.EnvironmentVariables?.["CONTAINER_CMD"]?.trim();
        if (customCmd) {
            config.Cmd = customCmd.split(" ");
        }
        return config;
    }
}
