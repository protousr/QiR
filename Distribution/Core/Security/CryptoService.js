import crypto from "node:crypto";
import { ConfigInstance } from "../../Config/EnvironmentConfig.js";
export class CryptoService {
    static Instance;
    DerivedKey;
    constructor() {
        this.DerivedKey = Buffer.from(crypto.hkdfSync("sha256", Buffer.from(ConfigInstance.MasterKey, "utf8"), Buffer.from("qir-salt", "utf8"), Buffer.from("qir-master-key-info", "utf8"), 32));
    }
    static GetInstance() {
        if (!CryptoService.Instance) {
            CryptoService.Instance = new CryptoService();
        }
        return CryptoService.Instance;
    }
    async HashPassword(password) {
        const salt = crypto.randomBytes(32).toString("hex");
        const hashBuffer = await new Promise((resolve, reject) => {
            crypto.scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, derivedKey) => {
                if (err)
                    return reject(err);
                resolve(derivedKey);
            });
        });
        return {
            Hash: hashBuffer.toString("hex"),
            Salt: salt,
        };
    }
    async VerifyPassword(password, storedHash, storedSalt) {
        try {
            const derivedKey = await new Promise((resolve, reject) => {
                crypto.scrypt(password, storedSalt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => {
                    if (err)
                        return reject(err);
                    resolve(key);
                });
            });
            const storedBuffer = Buffer.from(storedHash, "hex");
            if (storedBuffer.length !== derivedKey.length) {
                return false;
            }
            return crypto.timingSafeEqual(storedBuffer, derivedKey);
        }
        catch {
            return false;
        }
    }
    Encrypt(plaintext) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", this.DerivedKey, iv);
        let encrypted = cipher.update(plaintext, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag().toString("hex");
        return {
            Ciphertext: encrypted,
            Iv: iv.toString("hex"),
            AuthTag: authTag,
        };
    }
    Decrypt(encryptedData) {
        const decipher = crypto.createDecipheriv("aes-256-gcm", this.DerivedKey, Buffer.from(encryptedData.Iv, "hex"));
        decipher.setAuthTag(Buffer.from(encryptedData.AuthTag, "hex"));
        let decrypted = decipher.update(encryptedData.Ciphertext, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    GenerateSessionToken() {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        return { RawToken: rawToken, HashedToken: hashedToken };
    }
    HashToken(rawToken) {
        return crypto.createHash("sha256").update(rawToken).digest("hex");
    }
}
