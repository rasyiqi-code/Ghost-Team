import { z } from 'zod';
export declare const fileResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    originalName: z.ZodString;
    storageUrl: z.ZodString;
    fileType: z.ZodString;
    folder: z.ZodNullable<z.ZodString>;
    sizeBytes: z.ZodNumber;
    uploadedAt: z.ZodString;
    extractedText: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const fileSearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const fileSearchResponseSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        userId: z.ZodNumber;
        originalName: z.ZodString;
        storageUrl: z.ZodString;
        fileType: z.ZodString;
        folder: z.ZodNullable<z.ZodString>;
        sizeBytes: z.ZodNumber;
        uploadedAt: z.ZodString;
        extractedText: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    query: z.ZodString;
}, z.core.$strip>;
export type FileResponse = z.infer<typeof fileResponseSchema>;
export type FileSearch = z.infer<typeof fileSearchSchema>;
export type FileSearchResponse = z.infer<typeof fileSearchResponseSchema>;
//# sourceMappingURL=file.d.ts.map