import type Docker from "dockerode";
import { DockerClient } from "./DockerClient.js";
import type { IContainerBuildConfig } from "../Types/TemplateTypes.js";
import type { IPortMapping } from "../Types/ServerTypes.js";

export class ContainerManager {
  private readonly Client: Docker;

  public constructor() {
    this.Client = DockerClient.GetInstance().GetDocker();
  }

  public async PullImageIfNotExists(imageName: string): Promise<void> {
    try {
      await this.Client.getImage(imageName).inspect();
    } catch {
      await new Promise<void>((resolve, reject) => {
        this.Client.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            return reject(err);
          }
          this.Client.modem.followProgress(stream, (followErr: Error | null) => {
            if (followErr) {
              return reject(followErr);
            }
            resolve();
          });
        });
      });
    }
  }

  public async CreateContainer(
    containerName: string,
    buildConfig: IContainerBuildConfig
  ): Promise<Docker.Container> {
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

  public async StartContainer(containerId: string): Promise<void> {
    const container = this.Client.getContainer(containerId);
    await container.start();
  }

  public async StopContainer(containerId: string, timeoutSeconds: number = 10): Promise<void> {
    const container = this.Client.getContainer(containerId);
    await container.stop({ t: timeoutSeconds });
  }

  public async RestartContainer(containerId: string, timeoutSeconds: number = 10): Promise<void> {
    const container = this.Client.getContainer(containerId);
    await container.restart({ t: timeoutSeconds });
  }

  public async RemoveContainer(containerId: string, force: boolean = true): Promise<void> {
    const container = this.Client.getContainer(containerId);
    await container.remove({ force, v: true });
  }

  public async UpdateContainerLimits(
    containerId: string,
    memoryBytes?: number,
    nanoCpus?: number,
    restartPolicy?: string
  ): Promise<void> {
    const container = this.Client.getContainer(containerId);
    const updateOptions: {
      Memory?: number;
      NanoCPUs?: number;
      RestartPolicy?: { Name: string };
    } = {};
    if (typeof memoryBytes === "number") updateOptions.Memory = memoryBytes;
    if (typeof nanoCpus === "number") updateOptions.NanoCPUs = nanoCpus;
    if (restartPolicy) updateOptions.RestartPolicy = { Name: restartPolicy };
    await container.update(updateOptions);
  }

  public async RecreateContainerWithNewPorts(
    oldContainerId: string,
    newPorts: IPortMapping[]
  ): Promise<string> {
    const inspect = await this.InspectContainer(oldContainerId);
    const wasRunning = Boolean(inspect.State.Running);
    const containerName = inspect.Name.replace(/^\//, "");

    if (wasRunning) {
      await this.StopContainer(oldContainerId, 5);
    }
    await this.RemoveContainer(oldContainerId, true);

    const exposedPorts: Record<string, {}> = {};
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
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

  public async RecreateContainerWithNewEnv(
    oldContainerId: string,
    newEnv: Record<string, string>
  ): Promise<string> {
    const inspect = await this.InspectContainer(oldContainerId);
    const wasRunning = Boolean(inspect.State.Running);
    const containerName = inspect.Name.replace(/^\//, "");

    if (wasRunning) {
      await this.StopContainer(oldContainerId, 5);
    }
    await this.RemoveContainer(oldContainerId, true);

    const envArray: string[] = Object.entries(newEnv).map(([k, v]) => `${k}=${v}`);

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

  public async InspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo> {
    const container = this.Client.getContainer(containerId);
    return await container.inspect();
  }

  public GetContainer(containerId: string): Docker.Container {
    return this.Client.getContainer(containerId);
  }

  public async ListContainers(all: boolean = true): Promise<Docker.ContainerInfo[]> {
    return await this.Client.listContainers({ all });
  }

  public async ExecuteCommand(
    containerId: string,
    command: string[]
  ): Promise<{ ExitCode: number; Output: string }> {
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
      this.Client.modem.demuxStream(
        stream,
        {
          write: (chunk: Buffer) => {
            output += chunk.toString("utf8");
            return true;
          },
        } as unknown as NodeJS.WritableStream,
        {
          write: (chunk: Buffer) => {
            output += chunk.toString("utf8");
            return true;
          },
        } as unknown as NodeJS.WritableStream
      );

      stream.on("end", async () => {
        try {
          const inspectData = await exec.inspect();
          resolve({
            ExitCode: inspectData.ExitCode ?? 0,
            Output: output,
          });
        } catch (err) {
          reject(err);
        }
      });

      stream.on("error", (err: Error) => {
        reject(err);
      });
    });
  }
}
