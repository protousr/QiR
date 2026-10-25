import Docker from "dockerode";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
export class DockerClient {
    static Instance;
    Client;
    constructor() {
        const socketPath = ConfigInstance.DockerSocketPath;
        if (socketPath.startsWith("tcp://") || socketPath.startsWith("http://")) {
            const parsedUrl = new URL(socketPath);
            this.Client = new Docker({
                host: parsedUrl.hostname,
                port: Number(parsedUrl.port) || 2375,
            });
        }
        else {
            this.Client = new Docker({
                socketPath: socketPath,
            });
        }
    }
    static GetInstance() {
        if (!DockerClient.Instance) {
            DockerClient.Instance = new DockerClient();
        }
        return DockerClient.Instance;
    }
    GetDocker() {
        return this.Client;
    }
    async Ping() {
        try {
            await this.Client.ping();
            return true;
        }
        catch {
            return false;
        }
    }
    async GetVersion() {
        return await this.Client.version();
    }
}
