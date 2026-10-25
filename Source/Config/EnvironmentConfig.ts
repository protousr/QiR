import dotenv from "dotenv";
import path from "node:path";
import os from "node:os";

dotenv.config();

export interface IEnvironmentConfig {
  readonly Port: number;
  readonly Host: string;
  readonly DockerSocketPath: string;
  readonly DataDirectory: string;
  readonly LogLevel: string;
  readonly TrustProxy: boolean;
}

export class EnvironmentConfig implements IEnvironmentConfig {
  public readonly Port: number;
  public readonly Host: string;
  public readonly DockerSocketPath: string;
  public readonly DataDirectory: string;
  public readonly LogLevel: string;
  public readonly TrustProxy: boolean;

  public constructor() {
    this.Port = Number(process.env.PORT) || 4000;
    this.Host = process.env.HOST || "0.0.0.0";
    this.DockerSocketPath = process.env.DOCKER_SOCKET_PATH || this.DetermineDefaultDockerSocket();
    this.DataDirectory = process.env.DATA_DIRECTORY || path.resolve(process.cwd(), "Data");
    this.LogLevel = process.env.LOG_LEVEL || "info";
    this.TrustProxy = process.env.TRUST_PROXY ? process.env.TRUST_PROXY === "true" : true;
  }

  private DetermineDefaultDockerSocket(): string {
    if (os.platform() === "win32") {
      return "//./pipe/docker_engine";
    }
    return "/var/run/docker.sock";
  }
}

export const ConfigInstance = new EnvironmentConfig();
