import { pgTable, serial, integer, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
export const aiProviders = pgTable('ai_providers', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    providerType: varchar('provider_type', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    apiBaseUrl: varchar('api_base_url', { length: 500 }).notNull(),
    apiKey: varchar('api_key', { length: 500 }).notNull(),
    modelId: varchar('model_id', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=ai-providers.js.map