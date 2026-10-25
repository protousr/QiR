import Docker from "dockerode";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";

export class DockerClient {
  private static Instance: DockerClient;
  private readonly Client: Docker;

  private constructor() {
    const socketPath = ConfigInstance.DockerSocketPath;

    if (socketPath.startsWith("tcp://") || socketPath.startsWith("http://")) {
      const parsedUrl = new URL(socketPath);
      this.Client = new Docker({
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port) || 2375,
      });
    } else {
      this.Client = new Docker({
        socketPath: socketPath,
      });
    }
  }

  public static GetInstance(): DockerClient {
    if (!DockerClient.Instance) {
      DockerClient.Instance = new DockerClient();
    }
    return DockerClient.Instance;
  }

  public GetDocker(): Docker {
    return this.Client;
  }

  public async Ping(): Promise<boolean> {
    try {
      await this.Client.ping();
      return true;
    } catch {
      return false;
    }
  }

  public async GetVersion(): Promise<unknown> {
    return await this.Client.version();
  }
}
