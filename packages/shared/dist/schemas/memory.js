import { z } from 'zod';
export const memorySearchSchema = z.object({
    query: z.string().min(1),
    top_k: z.number().int().positive().default(3),
});
export const memorySearchResultSchema = z.object({
    content: z.string(),
    sender: z.string().default(''),
    platform: z.string().default(''),
    similarity: z.number().default(0),
});
export const memorySearchResponseSchema = z.object({
    query: z.string(),
    results: z.array(memorySearchResultSchema),
});
//# sourceMappingURL=memory.js.map