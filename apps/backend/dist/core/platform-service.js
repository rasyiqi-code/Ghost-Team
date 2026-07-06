export class PlatformService {
    async testConnection(platform, credentials) {
        switch (platform) {
            case 'telegram': return this.testTelegram(credentials);
            case 'slack': return this.testSlack(credentials);
            case 'whatsapp': return this.testWhatsApp(credentials);
            default: return { ok: false, error: `Unknown platform: ${platform}` };
        }
    }
    async sendMessage(platform, recipient, message, credentials) {
        try {
            switch (platform) {
                case 'telegram': return this.sendTelegram(recipient, message, credentials);
                case 'slack': return this.sendSlack(recipient, message, credentials);
                case 'whatsapp': return this.sendWhatsApp(recipient, message, credentials);
                default: return false;
            }
        }
        catch {
            return false;
        }
    }
    getTelegramCreds(c) {
        return c ?? { botToken: '', webhookSecret: '' };
    }
    getWhatsAppCreds(c) {
        return c ?? {
            appSecret: '',
            accessToken: '',
            phoneNumberId: '',
            verifyToken: '',
        };
    }
    getSlackCreds(c) {
        return c ?? { signingSecret: '', botToken: '' };
    }
    async testTelegram(creds) {
        const { botToken } = this.getTelegramCreds(creds);
        if (!botToken)
            return { ok: false, error: 'Telegram bot token not configured' };
        const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const data = await resp.json();
        if (data.ok)
            return { ok: true, bot: data.result.username };
        return { ok: false, error: data.description ?? 'Unknown error' };
    }
    async testSlack(creds) {
        const { botToken } = this.getSlackCreds(creds);
        if (!botToken)
            return { ok: false, error: 'Slack bot token not configured' };
        const resp = await fetch('https://slack.com/api/auth.test', {
            headers: { Authorization: `Bearer ${botToken}` },
            method: 'POST',
        });
        const data = await resp.json();
        if (data.ok)
            return { ok: true, team: data.team, user: data.user };
        return { ok: false, error: data.error ?? 'Unknown error' };
    }
    async testWhatsApp(creds) {
        const { accessToken, phoneNumberId } = this.getWhatsAppCreds(creds);
        if (!accessToken)
            return { ok: false, error: 'WhatsApp access token not configured' };
        if (!phoneNumberId)
            return { ok: false, error: 'WhatsApp phone number ID not configured' };
        const resp = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.ok) {
            const data = await resp.json();
            return { ok: true, name: data.display_phone_number };
        }
        return { ok: false, error: `HTTP ${resp.status}: ${await resp.text()}` };
    }
    async sendTelegram(chatId, message, creds) {
        const { botToken } = this.getTelegramCreds(creds);
        if (!botToken)
            return false;
        const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
        });
        return resp.ok;
    }
    async sendSlack(channel, message, creds) {
        const { botToken } = this.getSlackCreds(creds);
        if (!botToken)
            return false;
        const resp = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, text: message }),
        });
        const data = await resp.json();
        return data.ok ?? false;
    }
    async sendWhatsApp(to, message, creds) {
        const { accessToken, phoneNumberId } = this.getWhatsAppCreds(creds);
        if (!accessToken || !phoneNumberId)
            return false;
        const resp = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message },
            }),
        });
        return resp.ok;
    }
}
export const platformService = new PlatformService();
//# sourceMappingURL=platform-service.js.map