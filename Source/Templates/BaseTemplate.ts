import type {
  ITemplate,
  TemplateCategory,
  ITemplateField,
  IContainerBuildConfig,
} from "../Core/Types/TemplateTypes.js";
import type { ICreateServerInput, IPortMapping } from "../Core/Types/ServerTypes.js";

export abstract class BaseTemplate implements ITemplate {
  public abstract readonly Id: string;
  public abstract readonly Name: string;
  public abstract readonly Description: string;
  public abstract readonly Category: TemplateCategory;
  public abstract readonly DefaultImage: string;
  public abstract readonly DefaultPorts: IPortMapping[];
  public abstract readonly Fields: ITemplateField[];
  public abstract readonly VolumeMountPath: string;

  public BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const exposedPorts: Record<string, {}> = {};
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};

    const configuredPorts = input.Ports && input.Ports.length > 0 ? input.Ports : this.DefaultPorts;

    for (const port of configuredPorts) {
      const portKey = `${port.ContainerPort}/${port.Protocol}`;
      exposedPorts[portKey] = {};
      portBindings[portKey] = [{ HostPort: String(port.HostPort) }];
    }

    const mergedEnvMap: Record<string, string> = {};
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

    const envArray: string[] = Object.entries(mergedEnvMap).map(
      ([k, v]) => `${k}=${v}`
    );

    const binds: string[] = [];
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
        Name: input.AutoRestart ? "unless-stopped" : "no",
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
