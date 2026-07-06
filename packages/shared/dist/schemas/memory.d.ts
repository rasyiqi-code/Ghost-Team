import { z } from 'zod';
export declare const memorySearchSchema: z.ZodObject<{
    query: z.ZodString;
    top_k: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const memorySearchResultSchema: z.ZodObject<{
    content: z.ZodString;
    sender: z.ZodDefault<z.ZodString>;
    platform: z.ZodDefault<z.ZodString>;
    similarity: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const memorySearchResponseSchema: z.ZodObject<{
    query: z.ZodString;
    results: z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        sender: z.ZodDefault<z.ZodString>;
        platform: z.ZodDefault<z.ZodString>;
        similarity: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type MemorySearch = z.infer<typeof memorySearchSchema>;
export type MemorySearchResult = z.infer<typeof memorySearchResultSchema>;
export type MemorySearchResponse = z.infer<typeof memorySearchResponseSchema>;
//# sourceMappingURL=memory.d.ts.map