import { z } from 'zod';
export declare const aiProviderCreateSchema: z.ZodObject<{
    provider_type: z.ZodString;
    name: z.ZodString;
    api_base_url: z.ZodString;
    api_key: z.ZodDefault<z.ZodString>;
    model_id: z.ZodString;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const aiProviderResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    providerType: z.ZodString;
    name: z.ZodString;
    apiBaseUrl: z.ZodString;
    apiKey: z.ZodString;
    modelId: z.ZodString;
    isActive: z.ZodBoolean;
}, z.core.$strip>;
export declare const aiProviderUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    api_base_url: z.ZodOptional<z.ZodString>;
    api_key: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type AIProviderCreate = z.infer<typeof aiProviderCreateSchema>;
export type AIProviderResponse = z.infer<typeof aiProviderResponseSchema>;
export type AIProviderUpdate = z.infer<typeof aiProviderUpdateSchema>;
//# sourceMappingURL=ai.d.ts.map