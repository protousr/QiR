import os from "node:os";
import { DockerClient } from "../../Core/Docker/DockerClient.js";
export class SystemController {
    DockerClient;
    constructor() {
        this.DockerClient = DockerClient.GetInstance();
    }
    GetSystemStatus = async (request, reply) => {
        const isDockerAvailable = await this.DockerClient.Ping();
        let dockerVersion = null;
        if (isDockerAvailable) {
            try {
                dockerVersion = await this.DockerClient.GetVersion();
            }
            catch {
                dockerVersion = null;
            }
        }
        reply.send({
            Success: true,
            Data: {
                NodeVersion: process.version,
                Platform: os.platform(),
                Architecture: os.arch(),
                TotalMemoryBytes: os.totalmem(),
                FreeMemoryBytes: os.freemem(),
                CpuCount: os.cpus().length,
                DockerConnected: isDockerAvailable,
                DockerVersion: dockerVersion,
                UptimeSeconds: process.uptime(),
            },
        });
    };
}
