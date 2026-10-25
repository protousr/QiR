import crypto from "node:crypto";
import { DatabaseManager } from "../Database/DatabaseManager.js";
import { CryptoService } from "../Security/CryptoService.js";
export class AuthService {
    static Instance;
    DatabaseManager;
    CryptoService;
    constructor() {
        this.DatabaseManager = DatabaseManager.GetInstance();
        this.CryptoService = CryptoService.GetInstance();
    }
    static GetInstance() {
        if (!AuthService.Instance) {
            AuthService.Instance = new AuthService();
        }
        return AuthService.Instance;
    }
    IsSetupRequired() {
        return !this.DatabaseManager.HasAnyUser();
    }
    async SetupInitialAdmin(username, password) {
        if (!this.IsSetupRequired()) {
            throw new Error("Initial administrator already created.");
        }
        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters long.");
        }
        const { Hash, Salt } = await this.CryptoService.HashPassword(password);
        const user = {
            Id: crypto.randomUUID(),
            Username: username.trim(),
            PasswordHash: Hash,
            PasswordSalt: Salt,
            Role: "admin",
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
    async CreateUser(username, password, role = "user") {
        const existing = this.DatabaseManager.FindUserByUsername(username.trim());
        if (existing) {
            throw new Error(`Username ${username} is already taken.`);
        }
        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters long.");
        }
        const { Hash, Salt } = await this.CryptoService.HashPassword(password);
        const user = {
            Id: crypto.randomUUID(),
            Username: username.trim(),
            PasswordHash: Hash,
            PasswordSalt: Salt,
            Role: role,
            CreatedAt: new Date().toISOString(),
        };
        this.DatabaseManager.CreateUser(user);
        this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "USER_CREATE",
            IpAddress: "system",
            Details: `User ${user.Username} (${role}) created.`,
        });
        return user;
    }
    GetAllUsers() {
        return this.DatabaseManager.GetAllUsers();
    }
    DeleteUser(userId) {
        const user = this.DatabaseManager.FindUserById(userId);
        if (!user) {
            throw new Error("User not found.");
        }
        this.DatabaseManager.DeleteUser(userId);
        this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "USER_DELETE",
            IpAddress: "system",
            Details: `User ${user.Username} deleted.`,
        });
    }
    async Login(username, password, ipAddress, userAgent) {
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
        const isValid = await this.CryptoService.VerifyPassword(password, user.PasswordHash, user.PasswordSalt);
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
        const session = {
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
    ValidateSession(rawToken) {
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
    Logout(rawToken) {
        if (!rawToken) {
            return;
        }
        const hashedToken = this.CryptoService.HashToken(rawToken);
        this.DatabaseManager.DeleteSessionByTokenHash(hashedToken);
    }
    EncryptAndSaveSecret(key, secretValue) {
        const encrypted = this.CryptoService.Encrypt(secretValue);
        this.DatabaseManager.SaveSecret({
            Key: key,
            Iv: encrypted.Iv,
            AuthTag: encrypted.AuthTag,
            Ciphertext: encrypted.Ciphertext,
            UpdatedAt: new Date().toISOString(),
        });
    }
    GetAndDecryptSecret(key) {
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
        }
        catch {
            return null;
        }
    }
}
