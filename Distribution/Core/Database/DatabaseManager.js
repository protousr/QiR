import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
export class DatabaseManager {
    static Instance;
    Database;
    constructor() {
        fs.mkdirSync(ConfigInstance.DataDirectory, { recursive: true });
        const dbPath = path.resolve(ConfigInstance.DataDirectory, "QiR.db");
        this.Database = new DatabaseSync(dbPath);
        this.InitializeSchema();
    }
    static GetInstance() {
        if (!DatabaseManager.Instance) {
            DatabaseManager.Instance = new DatabaseManager();
        }
        return DatabaseManager.Instance;
    }
    InitializeSchema() {
        this.Database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS Users (
        Id TEXT PRIMARY KEY,
        Username TEXT UNIQUE NOT NULL,
        PasswordHash TEXT NOT NULL,
        PasswordSalt TEXT NOT NULL,
        Role TEXT NOT NULL DEFAULT 'user',
        CreatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Sessions (
        Id TEXT PRIMARY KEY,
        UserId TEXT NOT NULL,
        TokenHash TEXT UNIQUE NOT NULL,
        CreatedAt TEXT NOT NULL,
        ExpiresAt TEXT NOT NULL,
        IpAddress TEXT NOT NULL,
        UserAgent TEXT NOT NULL,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Secrets (
        Key TEXT PRIMARY KEY,
        Iv TEXT NOT NULL,
        AuthTag TEXT NOT NULL,
        Ciphertext TEXT NOT NULL,
        UpdatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS AuditLogs (
        Id TEXT PRIMARY KEY,
        Timestamp TEXT NOT NULL,
        Action TEXT NOT NULL,
        IpAddress TEXT NOT NULL,
        Details TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Schedules (
        Id TEXT PRIMARY KEY,
        ServerId TEXT NOT NULL,
        Name TEXT NOT NULL,
        TaskType TEXT NOT NULL,
        IntervalMinutes INTEGER NOT NULL,
        Command TEXT,
        Enabled INTEGER NOT NULL DEFAULT 1,
        LastRun TEXT,
        NextRun TEXT NOT NULL,
        CreatedAt TEXT NOT NULL
      );
    `);
        try {
            this.Database.exec("ALTER TABLE Users ADD COLUMN Role TEXT NOT NULL DEFAULT 'user'");
        }
        catch { }
        try {
            this.Database.exec("UPDATE Users SET Role = 'admin' WHERE Username = 'admin'");
        }
        catch { }
    }
    GetDatabase() {
        return this.Database;
    }
    HasAnyUser() {
        const row = this.Database.prepare("SELECT COUNT(*) as count FROM Users").get();
        return row.count > 0;
    }
    CreateUser(user) {
        const stmt = this.Database.prepare("INSERT INTO Users (Id, Username, PasswordHash, PasswordSalt, Role, CreatedAt) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run(user.Id, user.Username, user.PasswordHash, user.PasswordSalt, user.Role || "user", user.CreatedAt);
    }
    GetAllUsers() {
        const stmt = this.Database.prepare("SELECT Id, Username, PasswordHash, PasswordSalt, Role, CreatedAt FROM Users ORDER BY CreatedAt ASC");
        return stmt.all();
    }
    FindUserByUsername(username) {
        const stmt = this.Database.prepare("SELECT * FROM Users WHERE Username = ?");
        return stmt.get(username);
    }
    FindUserById(id) {
        const stmt = this.Database.prepare("SELECT * FROM Users WHERE Id = ?");
        return stmt.get(id);
    }
    DeleteUser(id) {
        const stmtSessions = this.Database.prepare("DELETE FROM Sessions WHERE UserId = ?");
        stmtSessions.run(id);
        const stmt = this.Database.prepare("DELETE FROM Users WHERE Id = ?");
        stmt.run(id);
    }
    CreateSession(session) {
        const stmt = this.Database.prepare("INSERT INTO Sessions (Id, UserId, TokenHash, CreatedAt, ExpiresAt, IpAddress, UserAgent) VALUES (?, ?, ?, ?, ?, ?, ?)");
        stmt.run(session.Id, session.UserId, session.TokenHash, session.CreatedAt, session.ExpiresAt, session.IpAddress, session.UserAgent);
    }
    FindSessionByTokenHash(tokenHash) {
        const stmt = this.Database.prepare("SELECT * FROM Sessions WHERE TokenHash = ?");
        return stmt.get(tokenHash);
    }
    DeleteSessionByTokenHash(tokenHash) {
        const stmt = this.Database.prepare("DELETE FROM Sessions WHERE TokenHash = ?");
        stmt.run(tokenHash);
    }
    CleanExpiredSessions() {
        const stmt = this.Database.prepare("DELETE FROM Sessions WHERE ExpiresAt < ?");
        stmt.run(new Date().toISOString());
    }
    SaveSecret(secret) {
        const stmt = this.Database.prepare("INSERT INTO Secrets (Key, Iv, AuthTag, Ciphertext, UpdatedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(Key) DO UPDATE SET Iv=excluded.Iv, AuthTag=excluded.AuthTag, Ciphertext=excluded.Ciphertext, UpdatedAt=excluded.UpdatedAt");
        stmt.run(secret.Key, secret.Iv, secret.AuthTag, secret.Ciphertext, secret.UpdatedAt);
    }
    GetSecret(key) {
        const stmt = this.Database.prepare("SELECT * FROM Secrets WHERE Key = ?");
        return stmt.get(key);
    }
    LogAudit(log) {
        const stmt = this.Database.prepare("INSERT INTO AuditLogs (Id, Timestamp, Action, IpAddress, Details) VALUES (?, ?, ?, ?, ?)");
        stmt.run(log.Id, log.Timestamp, log.Action, log.IpAddress, log.Details);
    }
    GetAuditLogs(limit = 50) {
        const stmt = this.Database.prepare("SELECT * FROM AuditLogs ORDER BY Timestamp DESC LIMIT ?");
        return stmt.all(limit);
    }
    GetAuditLogsForServer(serverId, limit = 50) {
        const stmt = this.Database.prepare("SELECT * FROM AuditLogs WHERE Details LIKE ? ORDER BY Timestamp DESC LIMIT ?");
        return stmt.all(`%${serverId}%`, limit);
    }
    CreateSchedule(schedule) {
        const stmt = this.Database.prepare("INSERT INTO Schedules (Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(schedule.Id, schedule.ServerId, schedule.Name, schedule.TaskType, schedule.IntervalMinutes, schedule.Command || null, schedule.Enabled ? 1 : 0, schedule.LastRun || null, schedule.NextRun, schedule.CreatedAt);
    }
    GetSchedulesForServer(serverId) {
        const stmt = this.Database.prepare("SELECT Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt FROM Schedules WHERE ServerId = ? ORDER BY CreatedAt ASC");
        const rows = stmt.all(serverId);
        return rows.map((r) => ({
            ...r,
            TaskType: r.TaskType,
            Enabled: Boolean(r.Enabled),
            Command: r.Command || undefined,
            LastRun: r.LastRun || undefined,
        }));
    }
    GetAllEnabledSchedules() {
        const stmt = this.Database.prepare("SELECT Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt FROM Schedules WHERE Enabled = 1");
        const rows = stmt.all();
        return rows.map((r) => ({
            ...r,
            TaskType: r.TaskType,
            Enabled: Boolean(r.Enabled),
            Command: r.Command || undefined,
            LastRun: r.LastRun || undefined,
        }));
    }
    FindScheduleById(id) {
        const stmt = this.Database.prepare("SELECT Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt FROM Schedules WHERE Id = ?");
        const r = stmt.get(id);
        if (!r)
            return undefined;
        return {
            ...r,
            TaskType: r.TaskType,
            Enabled: Boolean(r.Enabled),
            Command: r.Command || undefined,
            LastRun: r.LastRun || undefined,
        };
    }
    UpdateScheduleNextRun(id, lastRun, nextRun) {
        const stmt = this.Database.prepare("UPDATE Schedules SET LastRun = ?, NextRun = ? WHERE Id = ?");
        stmt.run(lastRun, nextRun, id);
    }
    ToggleSchedule(id, enabled) {
        const stmt = this.Database.prepare("UPDATE Schedules SET Enabled = ? WHERE Id = ?");
        stmt.run(enabled ? 1 : 0, id);
    }
    DeleteSchedule(id) {
        const stmt = this.Database.prepare("DELETE FROM Schedules WHERE Id = ?");
        stmt.run(id);
    }
}
