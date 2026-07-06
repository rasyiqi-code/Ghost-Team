import { pgTable, serial, integer, varchar, boolean, text } from 'drizzle-orm/pg-core';
import { users } from './users';
export const platformConnections = pgTable('platform_connections', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 50 }).notNull(),
    credentialsEncrypted: text('credentials_encrypted'),
    platformUserId: varchar('platform_user_id', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
});
//# sourceMappingURL=platforms.js.map