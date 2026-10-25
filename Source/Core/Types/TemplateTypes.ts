import type { IPortMapping, IVolumeMapping, IResourceLimits, ICreateServerInput } from "./ServerTypes.js";

export type TemplateCategory = "GameServer" | "Bot" | "Runtime" | "Database" | "Web" | "Custom";

export interface ITemplateField {
  Key: string;
  Label: string;
  DefaultValue: string;
  Required: boolean;
  Type: "text" | "number" | "boolean" | "select" | "password";
  Options?: string[];
  Description: string;
}

export interface IContainerBuildConfig {
  Image: string;
  Cmd?: string[];
  Env: string[];
  ExposedPorts: Record<string, {}>;
  PortBindings: Record<string, Array<{ HostPort: string }>>;
  Binds: string[];
  Memory?: number;
  CpuShares?: number;
  NanoCpus?: number;
  RestartPolicy?: {
    Name: "no" | "always" | "unless-stopped" | "on-failure";
  };
  AttachStdin: boolean;
  AttachStdout: boolean;
  AttachStderr: boolean;
  OpenStdin: boolean;
  StdinOnce: boolean;
  Tty: boolean;
}

export interface ITemplate {
  readonly Id: string;
  readonly Name: string;
  readonly Description: string;
  readonly Category: TemplateCategory;
  readonly DefaultImage: string;
  readonly DefaultPorts: IPortMapping[];
  readonly Fields: ITemplateField[];
  readonly VolumeMountPath: string;
  readonly InitialFiles?: Record<string, string>;
  BuildContainerConfig(input: ICreateServerInput, volumeHostPath: string): IContainerBuildConfig;
}
