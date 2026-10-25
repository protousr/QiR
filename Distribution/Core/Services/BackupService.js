import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
import { VolumeService } from "./VolumeService.js";
const execFileAsync = promisify(execFile);
export class BackupService {
    static Instance;
    BaseBackupDirectory;
    VolumeService;
    constructor() {
        this.BaseBackupDirectory = path.resolve(ConfigInstance.DataDirectory, "Backups");
        this.VolumeService = new VolumeService();
    }
    static GetInstance() {
        if (!BackupService.Instance) {
            BackupService.Instance = new BackupService();
        }
        return BackupService.Instance;
    }
    GetServerBackupDirectory(serverId) {
        return path.resolve(this.BaseBackupDirectory, serverId);
    }
    async EnsureBackupDirectory(serverId) {
        const dir = this.GetServerBackupDirectory(serverId);
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }
    async CreateBackup(serverId, customName) {
        const backupDir = await this.EnsureBackupDirectory(serverId);
        const volumePath = await this.VolumeService.EnsureServerVolume(serverId);
        const safeName = (customName || "snapshot").replace(/[^a-zA-Z0-9_-]/g, "_");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `${safeName}-${timestamp}.tar.gz`;
        const targetArchive = path.resolve(backupDir, fileName);
        await execFileAsync("tar", ["-czf", targetArchive, "-C", volumePath, "."]);
        const stat = await fs.stat(targetArchive);
        return {
            FileName: fileName,
            Name: customName || safeName,
            CreatedAt: new Date().toISOString(),
            SizeBytes: stat.size,
        };
    }
    async ListBackups(serverId) {
        const backupDir = await this.EnsureBackupDirectory(serverId);
        const entries = await fs.readdir(backupDir);
        const backups = [];
        for (const file of entries) {
            if (!file.endsWith(".tar.gz"))
                continue;
            const fullPath = path.resolve(backupDir, file);
            try {
                const stat = await fs.stat(fullPath);
                const namePart = file.split("-")[0] || file;
                backups.push({
                    FileName: file,
                    Name: namePart,
                    CreatedAt: stat.mtime.toISOString(),
                    SizeBytes: stat.size,
                });
            }
            catch { }
        }
        return backups.sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
    }
    async RestoreBackup(serverId, fileName) {
        const backupDir = this.GetServerBackupDirectory(serverId);
        const archivePath = path.resolve(backupDir, fileName);
        const volumePath = await this.VolumeService.EnsureServerVolume(serverId);
        await fs.access(archivePath);
        await execFileAsync("tar", ["-xzf", archivePath, "-C", volumePath]);
    }
    async DeleteBackup(serverId, fileName) {
        const backupDir = this.GetServerBackupDirectory(serverId);
        const archivePath = path.resolve(backupDir, fileName);
        await fs.rm(archivePath, { force: true });
    }
    GetBackupFilePath(serverId, fileName) {
        return path.resolve(this.GetServerBackupDirectory(serverId), fileName);
    }
}
