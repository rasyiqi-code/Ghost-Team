import { z } from 'zod';
export const voiceProcessResponseSchema = z.object({
    id: z.number(),
    status: z.string(),
    transcription: z.string().optional(),
});
export const voiceStatusResponseSchema = z.object({
    id: z.number(),
    status: z.string(),
    transcription: z.string().optional(),
    error: z.string().optional(),
});
export const voiceCommandTextSchema = z.object({
    text: z.string().min(1),
});
//# sourceMappingURL=voice.js.map