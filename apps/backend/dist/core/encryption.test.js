import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption.js';
describe('encryption', () => {
    it('should encrypt and decrypt a string correctly', () => {
        const plaintext = 'sk-test-api-key-12345';
        const encrypted = encrypt(plaintext);
        // Ciphertext should be different from plaintext
        expect(encrypted).not.toBe(plaintext);
        // Format: iv:tag:ciphertext (hex:hex:hex)
        expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
    });
    it('should return empty string when encrypting empty input', () => {
        expect(encrypt('')).toBe('');
    });
    it('should return empty string when decrypting empty input', () => {
        expect(decrypt('')).toBe('');
    });
    it('should return empty string for invalid ciphertext', () => {
        expect(decrypt('not-a-valid-ciphertext')).toBe('');
    });
    it('should return empty string for tampered ciphertext', () => {
        const encrypted = encrypt('sensitive-key');
        // Tamper with the ciphertext portion
        const parts = encrypted.split(':');
        const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;
        expect(decrypt(tampered)).toBe('');
    });
    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
        const plaintext = 'same-value-every-time';
        const encrypted1 = encrypt(plaintext);
        const encrypted2 = encrypt(plaintext);
        // Different IVs → different ciphertexts
        expect(encrypted1).not.toBe(encrypted2);
        // Both should decrypt correctly
        expect(decrypt(encrypted1)).toBe(plaintext);
        expect(decrypt(encrypted2)).toBe(plaintext);
    });
    it('should handle special characters', () => {
        const plaintext = 'hello 世界 🔐 123 !@#$%^&*()';
        expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });
    it('should handle long strings', () => {
        const plaintext = 'x'.repeat(10_000);
        expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });
    it('should be deterministic within the same encryption (decrypt of encrypt is identity)', () => {
        const secrets = [
            'short',
            'a-bit-longer-api-key-here',
            'sk-abcdef1234567890abcdef1234567890abcdef12',
        ];
        for (const secret of secrets) {
            expect(decrypt(encrypt(secret))).toBe(secret);
        }
    });
});
//# sourceMappingURL=encryption.test.js.map