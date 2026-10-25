import fs from "node:fs/promises";
import path from "node:path";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
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
    async EnsureServerVolume(serverId) {
        const volumePath = this.GetServerVolumePath(serverId);
        await fs.mkdir(volumePath, { recursive: true });
        return volumePath;
    }
    async ProvisionInitialFiles(serverId, files) {
        if (!files)
            return;
        const volumePath = await this.EnsureServerVolume(serverId);
        for (const [filename, content] of Object.entries(files)) {
            const targetPath = path.resolve(volumePath, filename);
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
        const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
        return await fs.readFile(filePath, "utf8");
    }
    async WriteFile(serverId, relativeFilePath, content) {
        const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf8");
    }
    async DeleteFile(serverId, relativeFilePath) {
        const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
        await fs.rm(filePath, { recursive: true, force: true });
    }
    async CreateDirectory(serverId, relativeSubPath) {
        const dirPath = path.resolve(this.GetServerVolumePath(serverId), relativeSubPath);
        await fs.mkdir(dirPath, { recursive: true });
    }
    async Rename(serverId, oldRelativePath, newRelativePath) {
        const oldPath = path.resolve(this.GetServerVolumePath(serverId), oldRelativePath);
        const newPath = path.resolve(this.GetServerVolumePath(serverId), newRelativePath);
        await fs.mkdir(path.dirname(newPath), { recursive: true });
        await fs.rename(oldPath, newPath);
    }
    async GetFileBuffer(serverId, relativeFilePath) {
        const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
        return await fs.readFile(filePath);
    }
    async WriteFileBuffer(serverId, relativeFilePath, buffer) {
        const filePath = path.resolve(this.GetServerVolumePath(serverId), relativeFilePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, buffer);
    }
}
