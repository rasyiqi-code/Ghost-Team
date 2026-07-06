import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=users.js.map