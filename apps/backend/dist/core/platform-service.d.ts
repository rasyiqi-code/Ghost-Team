import type { TelegramCredentials, WhatsAppCredentials, SlackCredentials } from './platform-credentials.js';
export declare class PlatformService {
    testConnection(platform: string, credentials?: TelegramCredentials | WhatsAppCredentials | SlackCredentials): Promise<Record<string, unknown>>;
    sendMessage(platform: string, recipient: string, message: string, credentials?: TelegramCredentials | WhatsAppCredentials | SlackCredentials): Promise<boolean>;
    private getTelegramCreds;
    private getWhatsAppCreds;
    private getSlackCreds;
    private testTelegram;
    private testSlack;
    private testWhatsApp;
    private sendTelegram;
    private sendSlack;
    private sendWhatsApp;
}
export declare const platformService: PlatformService;
//# sourceMappingURL=platform-service.d.ts.map