import type { Readable } from "node:stream";
import type Docker from "dockerode";
import { DockerClient } from "./DockerClient.js";
import type { IServerStats } from "../Types/ServerTypes.js";
import type { IDockerStatsStreamData } from "../Types/DockerTypes.js";

export class StatsCollector {
  private readonly Client: Docker;

  public constructor() {
    this.Client = DockerClient.GetInstance().GetDocker();
  }

  public async StreamStats(
    serverId: string,
    containerId: string,
    onStats: (stats: IServerStats) => void
  ): Promise<() => void> {
    const container = this.Client.getContainer(containerId);
    const stream = (await container.stats({ stream: true })) as Readable;

    let buffer = "";

    const dataHandler = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const parsedData = JSON.parse(line) as IDockerStatsStreamData;
          const calculatedStats = this.CalculateStats(serverId, parsedData);
          onStats(calculatedStats);
        } catch {
          continue;
        }
      }
    };

    stream.on("data", dataHandler);

    return () => {
      stream.removeListener("data", dataHandler);
      if (typeof (stream as unknown as { destroy: () => void }).destroy === "function") {
        (stream as unknown as { destroy: () => void }).destroy();
      }
    };
  }

  private CalculateStats(serverId: string, raw: IDockerStatsStreamData): IServerStats {
    let cpuPercent = 0.0;
    const cpuDelta =
      raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      (raw.cpu_stats.system_cpu_usage || 0) - (raw.precpu_stats.system_cpu_usage || 0);

    const onlineCpus =
      raw.cpu_stats.online_cpus ||
      raw.cpu_stats.cpu_usage.percpu_usage?.length ||
      1;

    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
    }

    const memoryUsage = raw.memory_stats.usage || 0;
    const memoryLimit = raw.memory_stats.limit || 1;
    const memoryPercent = (memoryUsage / memoryLimit) * 100.0;

    let networkRx = 0;
    let networkTx = 0;

    if (raw.networks) {
      for (const net of Object.values(raw.networks)) {
        networkRx += net.rx_bytes || 0;
        networkTx += net.tx_bytes || 0;
      }
    }

    return {
      ServerId: serverId,
      CpuPercentage: Number(cpuPercent.toFixed(2)),
      MemoryUsageBytes: memoryUsage,
      MemoryLimitBytes: memoryLimit,
      MemoryPercentage: Number(memoryPercent.toFixed(2)),
      NetworkInputBytes: networkRx,
      NetworkOutputBytes: networkTx,
      Timestamp: new Date().toISOString(),
    };
  }
}
