import { z } from 'zod';
export const reportResponseSchema = z.object({
    date: z.string(),
    totalMessages: z.number(),
    platforms: z.record(z.string(), z.number()),
    outboundCount: z.number(),
    inboundCount: z.number(),
    voiceNotes: z.number(),
    summary: z.string().nullable(),
});
export const reportGenerateResponseSchema = z.object({
    report: z.string(),
    messageCount: z.number(),
});
//# sourceMappingURL=report.js.map