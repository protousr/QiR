import type { Readable } from "node:stream";
import type Docker from "dockerode";
import { DockerClient } from "./DockerClient.js";

export class LogStreamer {
  private readonly Client: Docker;

  public constructor() {
    this.Client = DockerClient.GetInstance().GetDocker();
  }

  public async GetRecentLogs(containerId: string, tailLines: number = 100): Promise<string> {
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

  public async StreamLogs(
    containerId: string,
    onData: (chunk: string) => void
  ): Promise<() => void> {
    const container = this.Client.getContainer(containerId);
    const stream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: false,
      tail: 50,
    })) as Readable;

    const dataHandler = (chunk: Buffer) => {
      onData(chunk.toString("utf8"));
    };

    stream.on("data", dataHandler);

    return () => {
      stream.removeListener("data", dataHandler);
      if (typeof (stream as unknown as { destroy: () => void }).destroy === "function") {
        (stream as unknown as { destroy: () => void }).destroy();
      }
    };
  }

  public async AttachInteractiveStream(
    containerId: string
  ): Promise<{
    Stream: NodeJS.ReadWriteStream;
    Detach: () => void;
  }> {
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
        if (typeof (stream as unknown as { end: () => void }).end === "function") {
          (stream as unknown as { end: () => void }).end();
        }
      },
    };
  }
}
