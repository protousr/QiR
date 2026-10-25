import { DockerClient } from "./DockerClient.js";
export class LogStreamer {
    Client;
    constructor() {
        this.Client = DockerClient.GetInstance().GetDocker();
    }
    async GetRecentLogs(containerId, tailLines = 100) {
        const container = this.Client.getContainer(containerId);
        const logsBuffer = await container.logs({
            stdout: true,
            stderr: true,
            tail: tailLines,
            timestamps: false,
        });
        if (Buffer.isBuffer(logsBuffer)) {
            return logsBuffer.toString("utf8");
        }
        return String(logsBuffer);
    }
    async StreamLogs(containerId, onData) {
        const container = this.Client.getContainer(containerId);
        const stream = (await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            timestamps: false,
            tail: 50,
        }));
        const dataHandler = (chunk) => {
            onData(chunk.toString("utf8"));
        };
        stream.on("data", dataHandler);
        return () => {
            stream.removeListener("data", dataHandler);
            if (typeof stream.destroy === "function") {
                stream.destroy();
            }
        };
    }
    async AttachInteractiveStream(containerId) {
        const container = this.Client.getContainer(containerId);
        const stream = await container.attach({
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true,
        });
        return {
            Stream: stream,
            Detach: () => {
                if (typeof stream.end === "function") {
                    stream.end();
                }
            },
        };
    }
}
