export type ServerStatus =
  | "Created"
  | "Starting"
  | "Running"
  | "Stopping"
  | "Stopped"
  | "Restarting"
  | "Error"
  | "Unknown";

export interface IPortMapping {
  HostPort: number;
  ContainerPort: number;
  Protocol: "tcp" | "udp";
}

export interface IVolumeMapping {
  HostPath: string;
  ContainerPath: string;
  ReadOnly?: boolean;
}

export interface IResourceLimits {
  MemoryBytes?: number;
  CpuShares?: number;
  NanoCpus?: number;
}

export interface IServerInstance {
  Id: string;
  Name: string;
  TemplateId: string;
  ContainerId: string;
  Status: ServerStatus;
  CreatedAt: string;
  Ports: IPortMapping[];
  EnvironmentVariables: Record<string, string>;
  Limits: IResourceLimits;
  AutoRestart: boolean;
  OwnerId?: string;
  OwnerUsername?: string;
}

export interface ICreateServerInput {
  Name: string;
  TemplateId: string;
  Ports?: IPortMapping[];
  EnvironmentVariables?: Record<string, string>;
  Limits?: IResourceLimits;
  AutoRestart?: boolean;
  OwnerId?: string;
  OwnerUsername?: string;
}

export interface IServerStats {
  ServerId: string;
  CpuPercentage: number;
  MemoryUsageBytes: number;
  MemoryLimitBytes: number;
  MemoryPercentage: number;
  NetworkInputBytes: number;
  NetworkOutputBytes: number;
  Timestamp: string;
}

export interface IConsoleMessage {
  ServerId: string;
  Stream: "stdout" | "stderr" | "system";
  Text: string;
  Timestamp: string;
}
