import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
const execFileAsync = promisify(execFile);
export class VolumeService {
    BaseDirectory;
    constructor() {
        this.BaseDirectory = ConfigInstance.DataDirectory;
    }
    async Initialize() {
        await fs.mkdir(this.BaseDirectory, { recursive: true });
    }
    GetServerVolumePath(serverId) {
        return path.resolve(this.BaseDirectory, "Servers", serverId);
    }
    GetSafePath(serverId, relativePath = "") {
        const volumePath = path.resolve(this.GetServerVolumePath(serverId));
        const targetPath = path.resolve(volumePath, relativePath);
        const relative = path.relative(volumePath, targetPath);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("Access denied: Path traversal detected");
        }
        return targetPath;
    }
    async EnsureServerVolume(serverId) {
        const volumePath = this.GetServerVolumePath(serverId);
        await fs.mkdir(volumePath, { recursive: true });
        return volumePath;
    }
    async ProvisionInitialFiles(serverId, files) {
        if (!files)
            return;
        await this.EnsureServerVolume(serverId);
        for (const [filename, content] of Object.entries(files)) {
            const targetPath = this.GetSafePath(serverId, filename);
            try {
                await fs.access(targetPath);
            }
            catch {
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.writeFile(targetPath, content, "utf8");
            }
        }
    }
    async DeleteServerVolume(serverId) {
        const volumePath = this.GetServerVolumePath(serverId);
        try {
            await fs.rm(volumePath, { recursive: true, force: true });
        }
        catch {
            return;
        }
    }
    async ListFiles(serverId, subPath = "") {
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
                }
                catch {
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
    async ReadFile(serverId, relativeFilePath) {
        const filePath = this.GetSafePath(serverId, relativeFilePath);
        return await fs.readFile(filePath, "utf8");
    }
    async WriteFile(serverId, relativeFilePath, content) {
        const filePath = this.GetSafePath(serverId, relativeFilePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf8");
    }
    async DeleteFile(serverId, relativeFilePath) {
        const filePath = this.GetSafePath(serverId, relativeFilePath);
        await fs.rm(filePath, { recursive: true, force: true });
    }
    async CreateDirectory(serverId, relativeSubPath) {
        const dirPath = this.GetSafePath(serverId, relativeSubPath);
        await fs.mkdir(dirPath, { recursive: true });
    }
    async Rename(serverId, oldRelativePath, newRelativePath) {
        const oldPath = this.GetSafePath(serverId, oldRelativePath);
        const newPath = this.GetSafePath(serverId, newRelativePath);
        await fs.mkdir(path.dirname(newPath), { recursive: true });
        await fs.rename(oldPath, newPath);
    }
    async GetFileBuffer(serverId, relativeFilePath) {
        const filePath = this.GetSafePath(serverId, relativeFilePath);
        return await fs.readFile(filePath);
    }
    async WriteFileBuffer(serverId, relativeFilePath, buffer) {
        const filePath = this.GetSafePath(serverId, relativeFilePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, buffer);
    }
    async ExtractArchive(serverId, relativeArchivePath, targetRelativeDir = "") {
        const archivePath = this.GetSafePath(serverId, relativeArchivePath);
        const destDir = this.GetSafePath(serverId, targetRelativeDir);
        await fs.mkdir(destDir, { recursive: true });
        await execFileAsync("tar", ["-xf", archivePath, "-C", destDir]);
    }
    async CompressFiles(serverId, relativePaths, archiveName = "archive.tar.gz") {
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
        }
        else {
            tarArgs.push(".");
        }
        await execFileAsync("tar", tarArgs);
        return safeArchiveName;
    }
}
