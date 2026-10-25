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
    Base32Decode(encoded) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const cleaned = encoded.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
        let bits = 0;
        let value = 0;
        const output = [];
        for (let i = 0; i < cleaned.length; i++) {
            const idx = alphabet.indexOf(cleaned[i]);
            if (idx === -1)
                continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return Buffer.from(output);
    }
    GenerateTotpSecret() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const bytes = crypto.randomBytes(20);
        let secret = "";
        for (let i = 0; i < bytes.length; i++) {
            secret += alphabet[bytes[i] % 32];
        }
        return secret;
    }
    GenerateTotpUri(username, secret) {
        return `otpauth://totp/QiR:${encodeURIComponent(username)}?secret=${secret}&issuer=QiR`;
    }
    GenerateTotpCode(secret, timestampSeconds = Math.floor(Date.now() / 1000)) {
        const key = this.Base32Decode(secret);
        const counter = Math.floor(timestampSeconds / 30);
        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeBigInt64BE(BigInt(counter));
        const hmac = crypto.createHmac("sha1", key);
        hmac.update(counterBuffer);
        const digest = hmac.digest();
        const offset = digest[digest.length - 1] & 0x0f;
        const binary = ((digest[offset] & 0x7f) << 24) |
            ((digest[offset + 1] & 0xff) << 16) |
            ((digest[offset + 2] & 0xff) << 8) |
            (digest[offset + 3] & 0xff);
        const otp = binary % 1000000;
        return otp.toString().padStart(6, "0");
    }
    VerifyTotp(secret, token, windowSteps = 1) {
        if (!token || token.length !== 6)
            return false;
        const now = Math.floor(Date.now() / 1000);
        for (let step = -windowSteps; step <= windowSteps; step++) {
            const expectedCode = this.GenerateTotpCode(secret, now + step * 30);
            if (expectedCode === token) {
                return true;
            }
        }
        return false;
    }
}
