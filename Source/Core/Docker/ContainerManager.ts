import type Docker from "dockerode";
import { DockerClient } from "./DockerClient.js";
import type { IContainerBuildConfig } from "../Types/TemplateTypes.js";

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
    nanoCpus?: number
  ): Promise<void> {
    const container = this.Client.getContainer(containerId);
    await container.update({
      Memory: memoryBytes,
      NanoCPUs: nanoCpus,
    });
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
