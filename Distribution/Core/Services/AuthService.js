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
            TotpEnabled: 0,
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
            TotpEnabled: 0,
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
    SetupTotp(userId) {
        const user = this.DatabaseManager.FindUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const secret = this.CryptoService.GenerateTotpSecret();
        const uri = this.CryptoService.GenerateTotpUri(user.Username, secret);
        this.DatabaseManager.UpdateUserTotp(userId, secret, false);
        return { Secret: secret, Uri: uri };
    }
    VerifyAndEnableTotp(userId, token) {
        const user = this.DatabaseManager.FindUserById(userId);
        if (!user || !user.TotpSecret) {
            return false;
        }
        const isValid = this.CryptoService.VerifyTotp(user.TotpSecret, token.trim());
        if (!isValid) {
            return false;
        }
        this.DatabaseManager.UpdateUserTotp(userId, user.TotpSecret, true);
        this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "2FA_ENABLED",
            IpAddress: "system",
            Details: `User ${user.Username} enabled 2FA.`,
        });
        return true;
    }
    async DisableTotp(userId, password) {
        const user = this.DatabaseManager.FindUserById(userId);
        if (!user) {
            return false;
        }
        const isValid = await this.CryptoService.VerifyPassword(password, user.PasswordHash, user.PasswordSalt);
        if (!isValid) {
            return false;
        }
        this.DatabaseManager.UpdateUserTotp(userId, null, false);
        this.DatabaseManager.LogAudit({
            Id: crypto.randomUUID(),
            Timestamp: new Date().toISOString(),
            Action: "2FA_DISABLED",
            IpAddress: "system",
            Details: `User ${user.Username} disabled 2FA.`,
        });
        return true;
    }
    async Login(username, password, ipAddress, userAgent, totpCode) {
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
        if (user.TotpEnabled && user.TotpSecret) {
            if (!totpCode) {
                return { RequiresTotp: true };
            }
            const isTotpValid = this.CryptoService.VerifyTotp(user.TotpSecret, totpCode.trim());
            if (!isTotpValid) {
                this.DatabaseManager.LogAudit({
                    Id: crypto.randomUUID(),
                    Timestamp: new Date().toISOString(),
                    Action: "LOGIN_FAILED_2FA",
                    IpAddress: ipAddress,
                    Details: `Invalid 2FA code for: ${username}`,
                });
                return null;
            }
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
    GetActiveSessions(userId, currentRawToken) {
        const currentHash = currentRawToken ? this.CryptoService.HashToken(currentRawToken) : "";
        const sessions = this.DatabaseManager.GetUserSessions(userId);
        return sessions.map((s) => ({
            Id: s.Id,
            IpAddress: s.IpAddress,
            UserAgent: s.UserAgent,
            CreatedAt: s.CreatedAt,
            ExpiresAt: s.ExpiresAt,
            IsCurrent: s.TokenHash === currentHash,
        }));
    }
    RevokeSession(sessionId) {
        this.DatabaseManager.DeleteSessionById(sessionId);
    }
    RevokeOtherSessions(userId, currentRawToken) {
        const currentHash = this.CryptoService.HashToken(currentRawToken);
        this.DatabaseManager.DeleteOtherUserSessions(userId, currentHash);
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
