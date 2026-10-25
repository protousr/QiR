export class BaseTemplate {
    InitialFiles;
    BuildContainerConfig(input, volumeHostPath) {
        const exposedPorts = {};
        const portBindings = {};
        const configuredPorts = input.Ports && input.Ports.length > 0 ? input.Ports : this.DefaultPorts;
        for (const port of configuredPorts) {
            const portKey = `${port.ContainerPort}/${port.Protocol}`;
            exposedPorts[portKey] = {};
            portBindings[portKey] = [{ HostPort: String(port.HostPort) }];
        }
        const mergedEnvMap = {};
        for (const field of this.Fields) {
            if (field.DefaultValue !== undefined) {
                mergedEnvMap[field.Key] = field.DefaultValue;
            }
        }
        if (input.EnvironmentVariables) {
            for (const [key, val] of Object.entries(input.EnvironmentVariables)) {
                mergedEnvMap[key] = val;
            }
        }
        const envArray = Object.entries(mergedEnvMap).map(([k, v]) => `${k}=${v}`);
        const binds = [];
        if (this.VolumeMountPath && volumeHostPath) {
            binds.push(`${volumeHostPath.replace(/\\/g, "/")}:${this.VolumeMountPath}:rw`);
        }
        return {
            Image: this.DefaultImage,
            Env: envArray,
            ExposedPorts: exposedPorts,
            PortBindings: portBindings,
            Binds: binds,
            Memory: input.Limits?.MemoryBytes,
            CpuShares: input.Limits?.CpuShares,
            NanoCpus: input.Limits?.NanoCpus,
            RestartPolicy: {
                Name: input.RestartPolicy || (input.AutoRestart ? "unless-stopped" : "no"),
            },
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            OpenStdin: true,
            StdinOnce: false,
            Tty: true,
        };
    }
}
