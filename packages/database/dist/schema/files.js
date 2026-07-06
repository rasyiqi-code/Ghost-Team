import { pgTable, serial, integer, varchar, bigint, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users';
export const files = pgTable('files', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    originalName: varchar('original_name', { length: 500 }).notNull(),
    storageUrl: varchar('storage_url', { length: 1000 }).notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    folder: varchar('folder', { length: 255 }),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    extractedText: text('extracted_text'),
});
//# sourceMappingURL=files.js.map