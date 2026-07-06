import { z } from 'zod';
export declare const messageCreateSchema: z.ZodObject<{
    platform: z.ZodString;
    receiver_id: z.ZodString;
    content: z.ZodString;
    message_type: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const messageResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    platform: z.ZodString;
    senderId: z.ZodString;
    senderName: z.ZodNullable<z.ZodString>;
    content: z.ZodNullable<z.ZodString>;
    messageType: z.ZodString;
    fileId: z.ZodNullable<z.ZodNumber>;
    platformMessageId: z.ZodNullable<z.ZodString>;
    isOutgoing: z.ZodBoolean;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const messageListResponseSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        userId: z.ZodNumber;
        platform: z.ZodString;
        senderId: z.ZodString;
        senderName: z.ZodNullable<z.ZodString>;
        content: z.ZodNullable<z.ZodString>;
        messageType: z.ZodString;
        fileId: z.ZodNullable<z.ZodNumber>;
        platformMessageId: z.ZodNullable<z.ZodString>;
        isOutgoing: z.ZodBoolean;
        timestamp: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
}, z.core.$strip>;
export declare const messageSearchSchema: z.ZodObject<{
    query: z.ZodString;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type MessageCreate = z.infer<typeof messageCreateSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export type MessageListResponse = z.infer<typeof messageListResponseSchema>;
export type MessageSearch = z.infer<typeof messageSearchSchema>;
//# sourceMappingURL=message.d.ts.map