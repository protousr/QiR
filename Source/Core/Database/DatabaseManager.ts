import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
import type { ISchedule } from "../Types/ScheduleTypes.js";

export interface IUserRecord {
  Id: string;
  Username: string;
  PasswordHash: string;
  PasswordSalt: string;
  Role: "admin" | "user";
  CreatedAt: string;
  TotpSecret?: string | null;
  TotpEnabled?: number;
}

export interface ISessionRecord {
  Id: string;
  UserId: string;
  TokenHash: string;
  CreatedAt: string;
  ExpiresAt: string;
  IpAddress: string;
  UserAgent: string;
}

export interface ISecretRecord {
  Key: string;
  Iv: string;
  AuthTag: string;
  Ciphertext: string;
  UpdatedAt: string;
}

export interface IAuditLogRecord {
  Id: string;
  Timestamp: string;
  Action: string;
  IpAddress: string;
  Details: string;
}

export class DatabaseManager {
  private static Instance: DatabaseManager;
  private readonly Database: DatabaseSync;

  private constructor() {
    fs.mkdirSync(ConfigInstance.DataDirectory, { recursive: true });
    const dbPath = path.resolve(ConfigInstance.DataDirectory, "QiR.db");
    this.Database = new DatabaseSync(dbPath);
    this.InitializeSchema();
  }

  public static GetInstance(): DatabaseManager {
    if (!DatabaseManager.Instance) {
      DatabaseManager.Instance = new DatabaseManager();
    }
    return DatabaseManager.Instance;
  }

  private InitializeSchema(): void {
    this.Database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS Users (
        Id TEXT PRIMARY KEY,
        Username TEXT UNIQUE NOT NULL,
        PasswordHash TEXT NOT NULL,
        PasswordSalt TEXT NOT NULL,
        Role TEXT NOT NULL DEFAULT 'user',
        CreatedAt TEXT NOT NULL,
        TotpSecret TEXT,
        TotpEnabled INTEGER NOT NULL DEFAULT 0
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

      CREATE TABLE IF NOT EXISTS Settings (
        Key TEXT PRIMARY KEY,
        Value TEXT NOT NULL
      );
    `);

    try {
      this.Database.exec("ALTER TABLE Users ADD COLUMN Role TEXT NOT NULL DEFAULT 'user'");
    } catch {}
    try {
      this.Database.exec("ALTER TABLE Users ADD COLUMN TotpSecret TEXT");
    } catch {}
    try {
      this.Database.exec("ALTER TABLE Users ADD COLUMN TotpEnabled INTEGER NOT NULL DEFAULT 0");
    } catch {}
    try {
      this.Database.exec("UPDATE Users SET Role = 'admin' WHERE Username = 'admin'");
    } catch {}
  }

  public GetDatabase(): DatabaseSync {
    return this.Database;
  }

  public HasAnyUser(): boolean {
    const row = this.Database.prepare("SELECT COUNT(*) as count FROM Users").get() as {
      count: number;
    };
    return row.count > 0;
  }

  public CreateUser(user: IUserRecord): void {
    const stmt = this.Database.prepare(
      "INSERT INTO Users (Id, Username, PasswordHash, PasswordSalt, Role, CreatedAt, TotpSecret, TotpEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      user.Id,
      user.Username,
      user.PasswordHash,
      user.PasswordSalt,
      user.Role || "user",
      user.CreatedAt,
      user.TotpSecret || null,
      user.TotpEnabled || 0
    );
  }

  public GetAllUsers(): IUserRecord[] {
    const stmt = this.Database.prepare(
      "SELECT Id, Username, PasswordHash, PasswordSalt, Role, CreatedAt, TotpSecret, TotpEnabled FROM Users ORDER BY CreatedAt ASC"
    );
    return stmt.all() as unknown as IUserRecord[];
  }

  public FindUserByUsername(username: string): IUserRecord | undefined {
    const stmt = this.Database.prepare("SELECT * FROM Users WHERE Username = ?");
    return stmt.get(username) as IUserRecord | undefined;
  }

  public FindUserById(id: string): IUserRecord | undefined {
    const stmt = this.Database.prepare("SELECT * FROM Users WHERE Id = ?");
    return stmt.get(id) as IUserRecord | undefined;
  }

  public UpdateUserTotp(userId: string, secret: string | null, enabled: boolean): void {
    const stmt = this.Database.prepare(
      "UPDATE Users SET TotpSecret = ?, TotpEnabled = ? WHERE Id = ?"
    );
    stmt.run(secret, enabled ? 1 : 0, userId);
  }

  public DeleteUser(id: string): void {
    const stmtSessions = this.Database.prepare("DELETE FROM Sessions WHERE UserId = ?");
    stmtSessions.run(id);
    const stmt = this.Database.prepare("DELETE FROM Users WHERE Id = ?");
    stmt.run(id);
  }

  public CreateSession(session: ISessionRecord): void {
    const stmt = this.Database.prepare(
      "INSERT INTO Sessions (Id, UserId, TokenHash, CreatedAt, ExpiresAt, IpAddress, UserAgent) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      session.Id,
      session.UserId,
      session.TokenHash,
      session.CreatedAt,
      session.ExpiresAt,
      session.IpAddress,
      session.UserAgent
    );
  }

  public FindSessionByTokenHash(tokenHash: string): ISessionRecord | undefined {
    const stmt = this.Database.prepare("SELECT * FROM Sessions WHERE TokenHash = ?");
    return stmt.get(tokenHash) as ISessionRecord | undefined;
  }

  public GetUserSessions(userId: string): ISessionRecord[] {
    const stmt = this.Database.prepare(
      "SELECT * FROM Sessions WHERE UserId = ? AND ExpiresAt > ? ORDER BY CreatedAt DESC"
    );
    return stmt.all(userId, new Date().toISOString()) as unknown as ISessionRecord[];
  }

  public DeleteSessionById(sessionId: string): void {
    const stmt = this.Database.prepare("DELETE FROM Sessions WHERE Id = ?");
    stmt.run(sessionId);
  }

  public DeleteOtherUserSessions(userId: string, currentTokenHash: string): void {
    const stmt = this.Database.prepare(
      "DELETE FROM Sessions WHERE UserId = ? AND TokenHash != ?"
    );
    stmt.run(userId, currentTokenHash);
  }

  public DeleteSessionByTokenHash(tokenHash: string): void {
    const stmt = this.Database.prepare("DELETE FROM Sessions WHERE TokenHash = ?");
    stmt.run(tokenHash);
  }

  public CleanExpiredSessions(): void {
    const stmt = this.Database.prepare("DELETE FROM Sessions WHERE ExpiresAt < ?");
    stmt.run(new Date().toISOString());
  }

  public SaveSecret(secret: ISecretRecord): void {
    const stmt = this.Database.prepare(
      "INSERT INTO Secrets (Key, Iv, AuthTag, Ciphertext, UpdatedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(Key) DO UPDATE SET Iv=excluded.Iv, AuthTag=excluded.AuthTag, Ciphertext=excluded.Ciphertext, UpdatedAt=excluded.UpdatedAt"
    );
    stmt.run(secret.Key, secret.Iv, secret.AuthTag, secret.Ciphertext, secret.UpdatedAt);
  }

  public GetSecret(key: string): ISecretRecord | undefined {
    const stmt = this.Database.prepare("SELECT * FROM Secrets WHERE Key = ?");
    return stmt.get(key) as ISecretRecord | undefined;
  }

  public LogAudit(log: IAuditLogRecord): void {
    const stmt = this.Database.prepare(
      "INSERT INTO AuditLogs (Id, Timestamp, Action, IpAddress, Details) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(log.Id, log.Timestamp, log.Action, log.IpAddress, log.Details);
  }

  public GetAuditLogs(limit: number = 50): IAuditLogRecord[] {
    const stmt = this.Database.prepare(
      "SELECT * FROM AuditLogs ORDER BY Timestamp DESC LIMIT ?"
    );
    return stmt.all(limit) as unknown as IAuditLogRecord[];
  }

  public GetFilteredAuditLogs(action?: string, limit: number = 50): IAuditLogRecord[] {
    if (!action || action === "all") {
      return this.GetAuditLogs(limit);
    }
    const stmt = this.Database.prepare(
      "SELECT * FROM AuditLogs WHERE Action = ? ORDER BY Timestamp DESC LIMIT ?"
    );
    return stmt.all(action, limit) as unknown as IAuditLogRecord[];
  }

  public GetAuditLogsForServer(serverId: string, limit: number = 50): IAuditLogRecord[] {
    const stmt = this.Database.prepare(
      "SELECT * FROM AuditLogs WHERE Details LIKE ? ORDER BY Timestamp DESC LIMIT ?"
    );
    return stmt.all(`%${serverId}%`, limit) as unknown as IAuditLogRecord[];
  }

  public CreateSchedule(schedule: ISchedule): void {
    const stmt = this.Database.prepare(
      "INSERT INTO Schedules (Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      schedule.Id,
      schedule.ServerId,
      schedule.Name,
      schedule.TaskType,
      schedule.IntervalMinutes,
      schedule.Command || null,
      schedule.Enabled ? 1 : 0,
      schedule.LastRun || null,
      schedule.NextRun,
      schedule.CreatedAt
    );
  }

  public GetSchedulesForServer(serverId: string): ISchedule[] {
    const stmt = this.Database.prepare(
      "SELECT Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt FROM Schedules WHERE ServerId = ? ORDER BY CreatedAt ASC"
    );
    const rows = stmt.all(serverId) as Array<{
      Id: string;
      ServerId: string;
      Name: string;
      TaskType: string;
      IntervalMinutes: number;
      Command: string | null;
      Enabled: number;
      LastRun: string | null;
      NextRun: string;
      CreatedAt: string;
    }>;
    return rows.map((r) => ({
      ...r,
      TaskType: r.TaskType as ISchedule["TaskType"],
      Enabled: Boolean(r.Enabled),
      Command: r.Command || undefined,
      LastRun: r.LastRun || undefined,
    }));
  }

  public GetAllEnabledSchedules(): ISchedule[] {
    const stmt = this.Database.prepare(
      "SELECT Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt FROM Schedules WHERE Enabled = 1"
    );
    const rows = stmt.all() as Array<{
      Id: string;
      ServerId: string;
      Name: string;
      TaskType: string;
      IntervalMinutes: number;
      Command: string | null;
      Enabled: number;
      LastRun: string | null;
      NextRun: string;
      CreatedAt: string;
    }>;
    return rows.map((r) => ({
      ...r,
      TaskType: r.TaskType as ISchedule["TaskType"],
      Enabled: Boolean(r.Enabled),
      Command: r.Command || undefined,
      LastRun: r.LastRun || undefined,
    }));
  }

  public FindScheduleById(id: string): ISchedule | undefined {
    const stmt = this.Database.prepare(
      "SELECT Id, ServerId, Name, TaskType, IntervalMinutes, Command, Enabled, LastRun, NextRun, CreatedAt FROM Schedules WHERE Id = ?"
    );
    const r = stmt.get(id) as
      | {
          Id: string;
          ServerId: string;
          Name: string;
          TaskType: string;
          IntervalMinutes: number;
          Command: string | null;
          Enabled: number;
          LastRun: string | null;
          NextRun: string;
          CreatedAt: string;
        }
      | undefined;
    if (!r) return undefined;
    return {
      ...r,
      TaskType: r.TaskType as ISchedule["TaskType"],
      Enabled: Boolean(r.Enabled),
      Command: r.Command || undefined,
      LastRun: r.LastRun || undefined,
    };
  }

  public UpdateScheduleNextRun(id: string, lastRun: string, nextRun: string): void {
    const stmt = this.Database.prepare(
      "UPDATE Schedules SET LastRun = ?, NextRun = ? WHERE Id = ?"
    );
    stmt.run(lastRun, nextRun, id);
  }

  public ToggleSchedule(id: string, enabled: boolean): void {
    const stmt = this.Database.prepare("UPDATE Schedules SET Enabled = ? WHERE Id = ?");
    stmt.run(enabled ? 1 : 0, id);
  }

  public DeleteSchedule(id: string): void {
    const stmt = this.Database.prepare("DELETE FROM Schedules WHERE Id = ?");
    stmt.run(id);
  }

  public GetSetting(key: string): string | null {
    const row = this.Database.prepare("SELECT Value FROM Settings WHERE Key = ?").get(key) as { Value: string } | undefined;
    return row ? row.Value : null;
  }

  public SetSetting(key: string, value: string): void {
    const stmt = this.Database.prepare(
      "INSERT INTO Settings (Key, Value) VALUES (?, ?) ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value"
    );
    stmt.run(key, value);
  }
}
