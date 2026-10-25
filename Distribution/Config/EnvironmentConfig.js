import dotenv from "dotenv";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
dotenv.config();
export class EnvironmentConfig {
    Port;
    Host;
    DockerSocketPath;
    DataDirectory;
    LogLevel;
    TrustProxy;
    MasterKey;
    constructor() {
        this.Port = Number(process.env.PORT) || 4000;
        this.Host = process.env.HOST || "0.0.0.0";
        this.DockerSocketPath = process.env.DOCKER_SOCKET_PATH || this.DetermineDefaultDockerSocket();
        this.DataDirectory = process.env.DATA_DIRECTORY || path.resolve(process.cwd(), "Data");
        this.LogLevel = process.env.LOG_LEVEL || "info";
        this.TrustProxy = process.env.TRUST_PROXY ? process.env.TRUST_PROXY === "true" : true;
        this.MasterKey = process.env.MASTER_KEY || this.GetOrCreateMasterKey();
    }
    DetermineDefaultDockerSocket() {
        if (os.platform() === "win32") {
            return "//./pipe/docker_engine";
        }
        return "/var/run/docker.sock";
    }
    GetOrCreateMasterKey() {
        fs.mkdirSync(this.DataDirectory, { recursive: true });
        const keyPath = path.resolve(this.DataDirectory, "Secret.key");
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath, "utf8").trim();
        }
        const generated = crypto.randomBytes(32).toString("hex");
        fs.writeFileSync(keyPath, generated, { encoding: "utf8", mode: 0o600 });
        return generated;
    }
}
export const ConfigInstance = new EnvironmentConfig();
