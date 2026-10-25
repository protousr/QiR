import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";

const execFileAsync = promisify(execFile);

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

  public GetSafePath(serverId: string, relativePath: string = ""): string {
    const volumePath = path.resolve(this.GetServerVolumePath(serverId));
    const targetPath = path.resolve(volumePath, relativePath);
    const relative = path.relative(volumePath, targetPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Access denied: Path traversal detected");
    }
    return targetPath;
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
    await this.EnsureServerVolume(serverId);
    for (const [filename, content] of Object.entries(files)) {
      const targetPath = this.GetSafePath(serverId, filename);
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
    const targetPath = this.GetSafePath(serverId, subPath);
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
    const filePath = this.GetSafePath(serverId, relativeFilePath);
    return await fs.readFile(filePath, "utf8");
  }

  public async WriteFile(
    serverId: string,
    relativeFilePath: string,
    content: string
  ): Promise<void> {
    const filePath = this.GetSafePath(serverId, relativeFilePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }

  public async DeleteFile(serverId: string, relativeFilePath: string): Promise<void> {
    const filePath = this.GetSafePath(serverId, relativeFilePath);
    await fs.rm(filePath, { recursive: true, force: true });
  }

  public async CreateDirectory(serverId: string, relativeSubPath: string): Promise<void> {
    const dirPath = this.GetSafePath(serverId, relativeSubPath);
    await fs.mkdir(dirPath, { recursive: true });
  }

  public async Rename(
    serverId: string,
    oldRelativePath: string,
    newRelativePath: string
  ): Promise<void> {
    const oldPath = this.GetSafePath(serverId, oldRelativePath);
    const newPath = this.GetSafePath(serverId, newRelativePath);
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.rename(oldPath, newPath);
  }

  public async GetFileBuffer(serverId: string, relativeFilePath: string): Promise<Buffer> {
    const filePath = this.GetSafePath(serverId, relativeFilePath);
    return await fs.readFile(filePath);
  }

  public async WriteFileBuffer(
    serverId: string,
    relativeFilePath: string,
    buffer: Buffer
  ): Promise<void> {
    const filePath = this.GetSafePath(serverId, relativeFilePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  public async ExtractArchive(
    serverId: string,
    relativeArchivePath: string,
    targetRelativeDir: string = ""
  ): Promise<void> {
    const archivePath = this.GetSafePath(serverId, relativeArchivePath);
    const destDir = this.GetSafePath(serverId, targetRelativeDir);
    await fs.mkdir(destDir, { recursive: true });
    await execFileAsync("tar", ["-xf", archivePath, "-C", destDir]);
  }

  public async CompressFiles(
    serverId: string,
    relativePaths: string[],
    archiveName: string = "archive.tar.gz"
  ): Promise<string> {
    const safeArchiveName = archiveName.endsWith(".tar.gz") || archiveName.endsWith(".zip")
      ? archiveName
      : `${archiveName}.tar.gz`;
    const archivePath = this.GetSafePath(serverId, safeArchiveName);
    const volumePath = this.GetSafePath(serverId, "");

    const verifiedPaths = relativePaths.map((p) => {
      this.GetSafePath(serverId, p);
      return p;
    });

    const tarArgs = ["-czf", archivePath, "-C", volumePath];
    if (verifiedPaths.length > 0) {
      tarArgs.push(...verifiedPaths);
    } else {
      tarArgs.push(".");
    }

    await execFileAsync("tar", tarArgs);
    return safeArchiveName;
  }
}
