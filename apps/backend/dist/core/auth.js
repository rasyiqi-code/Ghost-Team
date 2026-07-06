import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { db } from '@ghost/database';
import { bearer } from 'better-auth/plugins';
import { randomUUID } from 'node:crypto';
export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: 'postgresql',
    }),
    trustedOrigins: ['http://localhost:5173'],
    advanced: {
        database: {
            generateId: (options) => {
                // Return false for user model so that PostgreSQL serial autoincrement works
                if (options.model === 'user') {
                    return false;
                }
                return randomUUID();
            },
        },
    },
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        bearer(),
    ],
});
//# sourceMappingURL=auth.js.map