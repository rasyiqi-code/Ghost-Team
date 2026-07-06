import { z } from 'zod';
export declare const platformConnectionCreateSchema: z.ZodObject<{
    platform: z.ZodString;
    credentials: z.ZodOptional<z.ZodString>;
    platform_user_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const platformConnectionUpdateSchema: z.ZodObject<{
    platform_user_id: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const platformConnectionResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    platform: z.ZodString;
    platformUserId: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
}, z.core.$strip>;
export declare const platformMetaSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    platform: z.ZodString;
    label: z.ZodString;
    color: z.ZodString;
}, z.core.$strip>;
export declare const webhookUrlsSchema: z.ZodObject<{
    telegram: z.ZodString;
    slack: z.ZodString;
    whatsapp: z.ZodString;
}, z.core.$strip>;
export type PlatformConnectionCreate = z.infer<typeof platformConnectionCreateSchema>;
export type PlatformConnectionResponse = z.infer<typeof platformConnectionResponseSchema>;
export type PlatformMeta = z.infer<typeof platformMetaSchema>;
export type WebhookUrls = z.infer<typeof webhookUrlsSchema>;
//# sourceMappingURL=platform.d.ts.map