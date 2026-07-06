import { pgTable, serial, varchar, text, boolean } from 'drizzle-orm/pg-core';
export const systemSettings = pgTable('system_settings', {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    value: text('value'),
    isActive: boolean('is_active').notNull().default(true),
});
//# sourceMappingURL=system-settings.js.map