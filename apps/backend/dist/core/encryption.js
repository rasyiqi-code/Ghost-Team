import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';
import { env } from '@ghost/config';
function deriveKey() {
    return pbkdf2Sync(env.ENCRYPTION_KEY, env.CRYPTO_SALT, 100000, 32, 'sha256');
}
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
export function encrypt(plaintext) {
    if (!plaintext)
        return '';
    const key = deriveKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + tag + ':' + encrypted;
}
export function decrypt(ciphertext) {
    if (!ciphertext)
        return '';
    try {
        const key = deriveKey();
        const parts = ciphertext.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch {
        return '';
    }
}
//# sourceMappingURL=encryption.js.map