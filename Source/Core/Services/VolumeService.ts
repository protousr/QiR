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

  public async ProvisionInitialFiles(
    serverId: string,
    files?: Record<string, string>
  ): Promise<void> {
    if (!files) return;
    const volumePath = await this.EnsureServerVolume(serverId);
    for (const [filename, content] of Object.entries(files)) {
      const targetPath = path.resolve(volumePath, filename);
      try {
        await fs.access(targetPath);
      } catch {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content, "utf8");
      }
    }
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
    await fs.mkdir(targetPath, { recursive: true });
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

  public async DeleteFile(serverId: string, relativeFilePath: string): Promise<void> {
    const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
    await fs.rm(filePath, { recursive: true, force: true });
  }

  public async CreateDirectory(serverId: string, relativeSubPath: string): Promise<void> {
    const dirPath = path.resolve(this.GetServerVolumePath(serverId), relativeSubPath);
    await fs.mkdir(dirPath, { recursive: true });
  }

  public async Rename(
    serverId: string,
    oldRelativePath: string,
    newRelativePath: string
  ): Promise<void> {
    const oldPath = path.resolve(this.GetServerVolumePath(serverId), oldRelativePath);
    const newPath = path.resolve(this.GetServerVolumePath(serverId), newRelativePath);
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.rename(oldPath, newPath);
  }

  public async GetFileBuffer(serverId: string, relativeFilePath: string): Promise<Buffer> {
    const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
    return await fs.readFile(filePath);
  }

  public async WriteFileBuffer(
    serverId: string,
    relativeFilePath: string,
    buffer: Buffer
  ): Promise<void> {
    const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }
}
