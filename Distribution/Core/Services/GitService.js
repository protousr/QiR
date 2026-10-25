import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
const execFileAsync = promisify(execFile);
export class GitService {
    VolumeService;
    constructor(volumeService) {
        this.VolumeService = volumeService;
    }
    async GetGitStatus(serverId, subPath = "") {
        const targetDir = this.VolumeService.GetSafePath(serverId, subPath);
        const gitDir = path.join(targetDir, ".git");
        try {
            const stat = await fs.stat(gitDir);
            if (!stat.isDirectory()) {
                return { IsRepo: false };
            }
        }
        catch {
            return { IsRepo: false };
        }
        try {
            const branchRes = await execFileAsync("git", ["branch", "--show-current"], {
                cwd: targetDir,
                timeout: 15000,
            }).catch(() => ({ stdout: "HEAD", stderr: "" }));
            const remoteRes = await execFileAsync("git", ["remote", "get-url", "origin"], {
                cwd: targetDir,
                timeout: 15000,
            }).catch(() => ({ stdout: "", stderr: "" }));
            const logRes = await execFileAsync("git", ["log", "-1", "--format=%h|%an|%ar|%s"], {
                cwd: targetDir,
                timeout: 15000,
            }).catch(() => ({ stdout: "", stderr: "" }));
            const statusRes = await execFileAsync("git", ["status", "--porcelain"], {
                cwd: targetDir,
                timeout: 15000,
            }).catch(() => ({ stdout: "", stderr: "" }));
            let commitInfo;
            const logStr = logRes.stdout.trim();
            if (logStr) {
                const parts = logStr.split("|");
                commitInfo = {
                    Hash: parts[0] || "",
                    Author: parts[1] || "",
                    Date: parts[2] || "",
                    Message: parts.slice(3).join("|") || "",
                };
            }
            return {
                IsRepo: true,
                Branch: branchRes.stdout.trim() || "HEAD",
                RemoteUrl: remoteRes.stdout.trim() || undefined,
                LastCommit: commitInfo,
                IsClean: statusRes.stdout.trim().length === 0,
                StatusOutput: statusRes.stdout.trim() || undefined,
            };
        }
        catch {
            return { IsRepo: false };
        }
    }
    async PullOrClone(serverId, options) {
        const targetDir = this.VolumeService.GetSafePath(serverId, options.SubPath || "");
        await fs.mkdir(targetDir, { recursive: true });
        const gitDir = path.join(targetDir, ".git");
        const hasGit = await fs
            .stat(gitDir)
            .then((s) => s.isDirectory())
            .catch(() => false);
        const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
        let output = "";
        if (hasGit) {
            if (options.RepoUrl) {
                try {
                    await execFileAsync("git", ["remote", "set-url", "origin", options.RepoUrl], {
                        cwd: targetDir,
                        env,
                        timeout: 30000,
                    });
                }
                catch {
                    await execFileAsync("git", ["remote", "add", "origin", options.RepoUrl], {
                        cwd: targetDir,
                        env,
                        timeout: 30000,
                    }).catch(() => null);
                }
            }
            if (options.Branch) {
                try {
                    const fetchRes = await execFileAsync("git", ["fetch", "origin", options.Branch], {
                        cwd: targetDir,
                        env,
                        timeout: 60000,
                    });
                    output += (fetchRes.stdout || fetchRes.stderr || "") + "\n";
                }
                catch { }
                try {
                    const checkoutRes = await execFileAsync("git", ["checkout", options.Branch], {
                        cwd: targetDir,
                        env,
                        timeout: 30000,
                    });
                    output += (checkoutRes.stdout || checkoutRes.stderr || "") + "\n";
                }
                catch { }
                const pullRes = await execFileAsync("git", ["pull", "origin", options.Branch], {
                    cwd: targetDir,
                    env,
                    timeout: 60000,
                });
                output += pullRes.stdout || pullRes.stderr || "";
            }
            else {
                const pullRes = await execFileAsync("git", ["pull"], {
                    cwd: targetDir,
                    env,
                    timeout: 60000,
                });
                output += pullRes.stdout || pullRes.stderr || "";
            }
        }
        else {
            if (!options.RepoUrl || !options.RepoUrl.trim()) {
                throw new Error("Repository URL is required for initial Git clone or sync.");
            }
            const existingEntries = await fs.readdir(targetDir);
            if (existingEntries.length === 0) {
                const cloneArgs = ["clone", "--depth", "1"];
                if (options.Branch && options.Branch.trim()) {
                    cloneArgs.push("-b", options.Branch.trim());
                }
                cloneArgs.push(options.RepoUrl.trim(), ".");
                const cloneRes = await execFileAsync("git", cloneArgs, {
                    cwd: targetDir,
                    env,
                    timeout: 60000,
                });
                output += cloneRes.stdout || cloneRes.stderr || "";
            }
            else {
                await execFileAsync("git", ["init"], { cwd: targetDir, env, timeout: 30000 });
                await execFileAsync("git", ["remote", "add", "origin", options.RepoUrl.trim()], {
                    cwd: targetDir,
                    env,
                    timeout: 30000,
                });
                const targetBranch = options.Branch && options.Branch.trim() ? options.Branch.trim() : "master";
                let fetchRes;
                try {
                    fetchRes = await execFileAsync("git", ["fetch", "--depth", "1", "origin", targetBranch], {
                        cwd: targetDir,
                        env,
                        timeout: 60000,
                    });
                }
                catch {
                    fetchRes = await execFileAsync("git", ["fetch", "--depth", "1", "origin", "main"], {
                        cwd: targetDir,
                        env,
                        timeout: 60000,
                    });
                }
                output += (fetchRes.stdout || fetchRes.stderr || "") + "\n";
                const checkoutRes = await execFileAsync("git", ["checkout", "-f", "-B", targetBranch, "FETCH_HEAD"], { cwd: targetDir, env, timeout: 30000 });
                output += checkoutRes.stdout || checkoutRes.stderr || "";
            }
        }
        const branchRes = await execFileAsync("git", ["branch", "--show-current"], {
            cwd: targetDir,
            timeout: 15000,
        }).catch(() => ({ stdout: "HEAD", stderr: "" }));
        const logRes = await execFileAsync("git", ["log", "-1", "--format=%h|%an|%ar|%s"], {
            cwd: targetDir,
            timeout: 15000,
        }).catch(() => ({ stdout: "", stderr: "" }));
        let commitInfo;
        const logStr = logRes.stdout.trim();
        if (logStr) {
            const parts = logStr.split("|");
            commitInfo = {
                Hash: parts[0] || "",
                Author: parts[1] || "",
                Date: parts[2] || "",
                Message: parts.slice(3).join("|") || "",
            };
        }
        return {
            Output: output.trim() || "Git sync completed successfully.",
            Branch: branchRes.stdout.trim() || "HEAD",
            LastCommit: commitInfo,
        };
    }
}
