export declare function hashPassword(password: string): string;
export declare function verifyPassword(plain: string, hash: string): boolean;
export declare function createAccessToken(payload: Record<string, unknown>): string;
export declare function decodeAccessToken(token: string): Record<string, unknown>;
//# sourceMappingURL=security.d.ts.map