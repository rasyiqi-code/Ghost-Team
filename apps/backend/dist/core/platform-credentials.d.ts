export interface TelegramCredentials {
    botToken: string;
    webhookSecret: string;
}
export interface WhatsAppCredentials {
    appSecret: string;
    accessToken: string;
    phoneNumberId: string;
    verifyToken: string;
}
export interface SlackCredentials {
    signingSecret: string;
    botToken: string;
}
export declare function loadTelegramCredentials(platformUserId: string): Promise<TelegramCredentials>;
export declare function loadWhatsAppCredentials(businessPhone: string): Promise<WhatsAppCredentials>;
export declare function loadSlackCredentials(teamId: string): Promise<SlackCredentials>;
//# sourceMappingURL=platform-credentials.d.ts.map