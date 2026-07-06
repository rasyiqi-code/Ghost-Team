import { z } from 'zod';
export declare const voiceProcessResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    status: z.ZodString;
    transcription: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const voiceStatusResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    status: z.ZodString;
    transcription: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const voiceCommandTextSchema: z.ZodObject<{
    text: z.ZodString;
}, z.core.$strip>;
export type VoiceProcessResponse = z.infer<typeof voiceProcessResponseSchema>;
export type VoiceStatusResponse = z.infer<typeof voiceStatusResponseSchema>;
export type VoiceCommandText = z.infer<typeof voiceCommandTextSchema>;
//# sourceMappingURL=voice.d.ts.map