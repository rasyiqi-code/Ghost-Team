import { pgTable, serial, integer, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { files } from './files';
export const messages = pgTable('messages', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 50 }).notNull(),
    senderId: varchar('sender_id', { length: 255 }).notNull(),
    senderName: varchar('sender_name', { length: 255 }),
    content: varchar('content', { length: 10000 }),
    messageType: varchar('message_type', { length: 20 }).notNull().default('text'),
    fileId: integer('file_id').references(() => files.id, { onDelete: 'set null' }),
    platformMessageId: varchar('platform_message_id', { length: 255 }),
    isOutgoing: boolean('is_outgoing').notNull().default(false),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=messages.js.map