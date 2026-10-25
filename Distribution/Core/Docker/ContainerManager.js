import { DockerClient } from "./DockerClient.js";
export class ContainerManager {
    Client;
    constructor() {
        this.Client = DockerClient.GetInstance().GetDocker();
    }
    async PullImageIfNotExists(imageName) {
        try {
            await this.Client.getImage(imageName).inspect();
        }
        catch {
            await new Promise((resolve, reject) => {
                this.Client.pull(imageName, (err, stream) => {
                    if (err) {
                        return reject(err);
                    }
                    this.Client.modem.followProgress(stream, (followErr) => {
                        if (followErr) {
                            return reject(followErr);
                        }
                        resolve();
                    });
                });
            });
        }
    }
    async CreateContainer(containerName, buildConfig) {
        await this.PullImageIfNotExists(buildConfig.Image);
        const container = await this.Client.createContainer({
            name: containerName,
            Image: buildConfig.Image,
            Cmd: buildConfig.Cmd,
            Env: buildConfig.Env,
            ExposedPorts: buildConfig.ExposedPorts,
            HostConfig: {
                PortBindings: buildConfig.PortBindings,
                Binds: buildConfig.Binds,
                Memory: buildConfig.Memory,
                CpuShares: buildConfig.CpuShares,
                NanoCpus: buildConfig.NanoCpus,
                RestartPolicy: buildConfig.RestartPolicy,
            },
            AttachStdin: buildConfig.AttachStdin,
            AttachStdout: buildConfig.AttachStdout,
            AttachStderr: buildConfig.AttachStderr,
            OpenStdin: buildConfig.OpenStdin,
            StdinOnce: buildConfig.StdinOnce,
            Tty: buildConfig.Tty,
        });
        return container;
    }
    async StartContainer(containerId) {
        const container = this.Client.getContainer(containerId);
        await container.start();
    }
    async StopContainer(containerId, timeoutSeconds = 10) {
        const container = this.Client.getContainer(containerId);
        await container.stop({ t: timeoutSeconds });
    }
    async RestartContainer(containerId, timeoutSeconds = 10) {
        const container = this.Client.getContainer(containerId);
        await container.restart({ t: timeoutSeconds });
    }
    async RemoveContainer(containerId, force = true) {
        const container = this.Client.getContainer(containerId);
        await container.remove({ force, v: true });
    }
    async UpdateContainerLimits(containerId, memoryBytes, nanoCpus, restartPolicy) {
        const container = this.Client.getContainer(containerId);
        const updateOptions = {};
        if (typeof memoryBytes === "number")
            updateOptions.Memory = memoryBytes;
        if (typeof nanoCpus === "number")
            updateOptions.NanoCPUs = nanoCpus;
        if (restartPolicy)
            updateOptions.RestartPolicy = { Name: restartPolicy };
        await container.update(updateOptions);
    }
    async RecreateContainerWithNewPorts(oldContainerId, newPorts) {
        const inspect = await this.InspectContainer(oldContainerId);
        const wasRunning = Boolean(inspect.State.Running);
        const containerName = inspect.Name.replace(/^\//, "");
        if (wasRunning) {
            await this.StopContainer(oldContainerId, 5);
        }
        await this.RemoveContainer(oldContainerId, true);
        const exposedPorts = {};
        const portBindings = {};
        for (const port of newPorts) {
            const portKey = `${port.ContainerPort}/${port.Protocol || "tcp"}`;
            exposedPorts[portKey] = {};
            portBindings[portKey] = [{ HostPort: String(port.HostPort) }];
        }
        const newContainer = await this.Client.createContainer({
            name: containerName,
            Image: inspect.Config.Image,
            Cmd: inspect.Config.Cmd,
            Env: inspect.Config.Env,
            ExposedPorts: exposedPorts,
            HostConfig: {
                PortBindings: portBindings,
                Binds: inspect.HostConfig.Binds,
                Memory: inspect.HostConfig.Memory,
                CpuShares: inspect.HostConfig.CpuShares,
                NanoCpus: inspect.HostConfig.NanoCpus,
                RestartPolicy: inspect.HostConfig.RestartPolicy,
            },
            AttachStdin: inspect.Config.AttachStdin,
            AttachStdout: inspect.Config.AttachStdout,
            AttachStderr: inspect.Config.AttachStderr,
            OpenStdin: inspect.Config.OpenStdin,
            StdinOnce: inspect.Config.StdinOnce,
            Tty: inspect.Config.Tty,
        });
        if (wasRunning) {
            await newContainer.start();
        }
        return newContainer.id;
    }
    async RecreateContainerWithNewEnv(oldContainerId, newEnv) {
        const inspect = await this.InspectContainer(oldContainerId);
        const wasRunning = Boolean(inspect.State.Running);
        const containerName = inspect.Name.replace(/^\//, "");
        if (wasRunning) {
            await this.StopContainer(oldContainerId, 5);
        }
        await this.RemoveContainer(oldContainerId, true);
        const envArray = Object.entries(newEnv).map(([k, v]) => `${k}=${v}`);
        const newContainer = await this.Client.createContainer({
            name: containerName,
            Image: inspect.Config.Image,
            Cmd: inspect.Config.Cmd,
            Env: envArray,
            ExposedPorts: inspect.Config.ExposedPorts,
            HostConfig: inspect.HostConfig,
            AttachStdin: inspect.Config.AttachStdin,
            AttachStdout: inspect.Config.AttachStdout,
            AttachStderr: inspect.Config.AttachStderr,
            OpenStdin: inspect.Config.OpenStdin,
            StdinOnce: inspect.Config.StdinOnce,
            Tty: inspect.Config.Tty,
        });
        if (wasRunning) {
            await newContainer.start();
        }
        return newContainer.id;
    }
    async InspectContainer(containerId) {
        const container = this.Client.getContainer(containerId);
        return await container.inspect();
    }
    GetContainer(containerId) {
        return this.Client.getContainer(containerId);
    }
    async ListContainers(all = true) {
        return await this.Client.listContainers({ all });
    }
    async ExecuteCommand(containerId, command) {
        const container = this.Client.getContainer(containerId);
        const exec = await container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
        });
        const stream = await exec.start({ Detach: false, Tty: false });
        let output = "";
        return new Promise((resolve, reject) => {
            this.Client.modem.demuxStream(stream, {
                write: (chunk) => {
                    output += chunk.toString("utf8");
                    return true;
                },
            }, {
                write: (chunk) => {
                    output += chunk.toString("utf8");
                    return true;
                },
            });
            stream.on("end", async () => {
                try {
                    const inspectData = await exec.inspect();
                    resolve({
                        ExitCode: inspectData.ExitCode ?? 0,
                        Output: output,
                    });
                }
                catch (err) {
                    reject(err);
                }
            });
            stream.on("error", (err) => {
                reject(err);
            });
        });
    }
}
