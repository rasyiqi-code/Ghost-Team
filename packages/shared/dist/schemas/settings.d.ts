import { z } from 'zod';
export declare const systemSettingItemSchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const envSettingResponseSchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodString;
    source: z.ZodString;
}, z.core.$strip>;
export declare const editableKeys: readonly ["OPENAI_API_KEY", "OPENAI_BASE_URL", "QWEN_MODEL", "QWEN_EMBEDDING_MODEL", "QWEN_AUDIO_MODEL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET", "STORAGE_DIR"];
export type SystemSettingItem = z.infer<typeof systemSettingItemSchema>;
export type EnvSettingResponse = z.infer<typeof envSettingResponseSchema>;
export type EditableKey = (typeof editableKeys)[number];
//# sourceMappingURL=settings.d.ts.map