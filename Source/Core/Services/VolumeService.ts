import fs from "node:fs/promises";
import path from "node:path";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";

export class VolumeService {
  private readonly BaseDirectory: string;

  public constructor() {
    this.BaseDirectory = ConfigInstance.DataDirectory;
  }

  public async Initialize(): Promise<void> {
    await fs.mkdir(this.BaseDirectory, { recursive: true });
  }

  public GetServerVolumePath(serverId: string): string {
    return path.resolve(this.BaseDirectory, "Servers", serverId);
  }

  public async EnsureServerVolume(serverId: string): Promise<string> {
    const volumePath = this.GetServerVolumePath(serverId);
    await fs.mkdir(volumePath, { recursive: true });
    return volumePath;
  }

  public async DeleteServerVolume(serverId: string): Promise<void> {
    const volumePath = this.GetServerVolumePath(serverId);
    try {
      await fs.rm(volumePath, { recursive: true, force: true });
    } catch {
      return;
    }
  }

  public async ListFiles(
    serverId: string,
    subPath: string = ""
  ): Promise<Array<{ Name: string; IsDirectory: boolean; Size: number }>> {
    const targetPath = path.resolve(this.GetServerVolumePath(serverId), subPath);
    const entries = await fs.readdir(targetPath, { withFileTypes: true });

    const results = [];
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      let size = 0;
      if (!entry.isDirectory()) {
        try {
          const stat = await fs.stat(fullPath);
          size = stat.size;
        } catch {
          size = 0;
        }
      }

      results.push({
        Name: entry.name,
        IsDirectory: entry.isDirectory(),
        Size: size,
      });
    }

    return results;
  }

  public async ReadFile(serverId: string, relativeFilePath: string): Promise<string> {
    const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
    return await fs.readFile(filePath, "utf8");
  }

  public async WriteFile(
    serverId: string,
    relativeFilePath: string,
    content: string
  ): Promise<void> {
    const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }
}
