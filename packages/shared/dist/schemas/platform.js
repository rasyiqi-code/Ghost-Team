import { z } from 'zod';
export const platformConnectionCreateSchema = z.object({
    platform: z.string().min(1).max(50),
    credentials: z.string().optional(),
    platform_user_id: z.string().optional(),
});
export const platformConnectionUpdateSchema = z.object({
    platform_user_id: z.string().optional(),
    is_active: z.boolean().optional(),
});
export const platformConnectionResponseSchema = z.object({
    id: z.number(),
    userId: z.number(),
    platform: z.string(),
    platformUserId: z.string().nullable(),
    isActive: z.boolean(),
});
export const platformMetaSchema = z.object({
    id: z.string(),
    name: z.string(),
    platform: z.string(),
    label: z.string(),
    color: z.string(),
});
export const webhookUrlsSchema = z.object({
    telegram: z.string(),
    slack: z.string(),
    whatsapp: z.string(),
});
//# sourceMappingURL=platform.js.map