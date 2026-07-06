import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '@ghost/config';
export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}
export function verifyPassword(plain, hash) {
    return bcrypt.compareSync(plain, hash);
}
export function createAccessToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET_KEY, {
        algorithm: env.JWT_ALGORITHM,
        expiresIn: `${env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES}m`,
    });
}
export function decodeAccessToken(token) {
    return jwt.verify(token, env.JWT_SECRET_KEY, {
        algorithms: [env.JWT_ALGORITHM],
    });
}
//# sourceMappingURL=security.js.map