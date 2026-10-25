import crypto from "node:crypto";
import { DatabaseManager, IUserRecord, ISessionRecord } from "../Database/DatabaseManager.js";
import { CryptoService } from "../Security/CryptoService.js";

export class AuthService {
  private static Instance: AuthService;
  private readonly DatabaseManager: DatabaseManager;
  private readonly CryptoService: CryptoService;

  private constructor() {
    this.DatabaseManager = DatabaseManager.GetInstance();
    this.CryptoService = CryptoService.GetInstance();
  }

  public static GetInstance(): AuthService {
    if (!AuthService.Instance) {
      AuthService.Instance = new AuthService();
    }
    return AuthService.Instance;
  }

  public IsSetupRequired(): boolean {
    return !this.DatabaseManager.HasAnyUser();
  }

  public async SetupInitialAdmin(username: string, password: string): Promise<IUserRecord> {
    if (!this.IsSetupRequired()) {
      throw new Error("Initial administrator already created.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const { Hash, Salt } = await this.CryptoService.HashPassword(password);
    const user: IUserRecord = {
      Id: crypto.randomUUID(),
      Username: username.trim(),
      PasswordHash: Hash,
      PasswordSalt: Salt,
      CreatedAt: new Date().toISOString(),
    };

    this.DatabaseManager.CreateUser(user);
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "USER_SETUP",
      IpAddress: "system",
      Details: `Initial admin ${user.Username} created.`,
    });

    return user;
  }

  public async Login(
    username: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ User: IUserRecord; RawToken: string; ExpiresAt: string } | null> {
    this.DatabaseManager.CleanExpiredSessions();

    const user = this.DatabaseManager.FindUserByUsername(username.trim());
    if (!user) {
      this.DatabaseManager.LogAudit({
        Id: crypto.randomUUID(),
        Timestamp: new Date().toISOString(),
        Action: "LOGIN_FAILED",
        IpAddress: ipAddress,
        Details: `Unknown user: ${username}`,
      });
      return null;
    }

    const isValid = await this.CryptoService.VerifyPassword(
      password,
      user.PasswordHash,
      user.PasswordSalt
    );

    if (!isValid) {
      this.DatabaseManager.LogAudit({
        Id: crypto.randomUUID(),
        Timestamp: new Date().toISOString(),
        Action: "LOGIN_FAILED",
        IpAddress: ipAddress,
        Details: `Invalid password for: ${username}`,
      });
      return null;
    }

    const { RawToken, HashedToken } = this.CryptoService.GenerateSessionToken();
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 7);
    const expiresAt = expiresDate.toISOString();

    const session: ISessionRecord = {
      Id: crypto.randomUUID(),
      UserId: user.Id,
      TokenHash: HashedToken,
      CreatedAt: new Date().toISOString(),
      ExpiresAt: expiresAt,
      IpAddress: ipAddress,
      UserAgent: userAgent,
    };

    this.DatabaseManager.CreateSession(session);
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "LOGIN_SUCCESS",
      IpAddress: ipAddress,
      Details: `User ${user.Username} authenticated.`,
    });

    return {
      User: user,
      RawToken: RawToken,
      ExpiresAt: expiresAt,
    };
  }

  public ValidateSession(rawToken: string): IUserRecord | null {
    if (!rawToken) {
      return null;
    }

    const hashedToken = this.CryptoService.HashToken(rawToken);
    const session = this.DatabaseManager.FindSessionByTokenHash(hashedToken);
    if (!session) {
      return null;
    }

    if (new Date(session.ExpiresAt).getTime() <= Date.now()) {
      this.DatabaseManager.DeleteSessionByTokenHash(hashedToken);
      return null;
    }

    const user = this.DatabaseManager.FindUserById(session.UserId);
    return user || null;
  }

  public Logout(rawToken: string): void {
    if (!rawToken) {
      return;
    }
    const hashedToken = this.CryptoService.HashToken(rawToken);
    this.DatabaseManager.DeleteSessionByTokenHash(hashedToken);
  }

  public EncryptAndSaveSecret(key: string, secretValue: string): void {
    const encrypted = this.CryptoService.Encrypt(secretValue);
    this.DatabaseManager.SaveSecret({
      Key: key,
      Iv: encrypted.Iv,
      AuthTag: encrypted.AuthTag,
      Ciphertext: encrypted.Ciphertext,
      UpdatedAt: new Date().toISOString(),
    });
  }

  public GetAndDecryptSecret(key: string): string | null {
    const record = this.DatabaseManager.GetSecret(key);
    if (!record) {
      return null;
    }
    try {
      return this.CryptoService.Decrypt({
        Ciphertext: record.Ciphertext,
        Iv: record.Iv,
        AuthTag: record.AuthTag,
      });
    } catch {
      return null;
    }
  }
}
