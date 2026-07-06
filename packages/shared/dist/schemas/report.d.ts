import { z } from 'zod';
export declare const reportResponseSchema: z.ZodObject<{
    date: z.ZodString;
    totalMessages: z.ZodNumber;
    platforms: z.ZodRecord<z.ZodString, z.ZodNumber>;
    outboundCount: z.ZodNumber;
    inboundCount: z.ZodNumber;
    voiceNotes: z.ZodNumber;
    summary: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const reportGenerateResponseSchema: z.ZodObject<{
    report: z.ZodString;
    messageCount: z.ZodNumber;
}, z.core.$strip>;
export type ReportResponse = z.infer<typeof reportResponseSchema>;
export type ReportGenerateResponse = z.infer<typeof reportGenerateResponseSchema>;
//# sourceMappingURL=report.d.ts.map