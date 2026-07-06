import { z } from 'zod';
export const messageCreateSchema = z.object({
    platform: z.string().min(1).max(50),
    receiver_id: z.string(),
    content: z.string().min(1).max(10000),
    message_type: z.string().default('text'),
});
export const messageResponseSchema = z.object({
    id: z.number(),
    userId: z.number(),
    platform: z.string(),
    senderId: z.string(),
    senderName: z.string().nullable(),
    content: z.string().nullable(),
    messageType: z.string(),
    fileId: z.number().nullable(),
    platformMessageId: z.string().nullable(),
    isOutgoing: z.boolean(),
    timestamp: z.string(),
});
export const messageListResponseSchema = z.object({
    messages: z.array(messageResponseSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
});
export const messageSearchSchema = z.object({
    query: z.string().min(1),
    page: z.number().int().positive().default(1),
    page_size: z.number().int().positive().max(200).default(50),
});
//# sourceMappingURL=message.js.map