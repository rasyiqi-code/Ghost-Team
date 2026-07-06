import { db } from '@ghost/database';
import { encrypt, decrypt } from '../../core/encryption.js';
import { platformService } from '../../core/platform-service.js';
import { validate, sendValidationError, ValidationError } from '../../core/validation.js';
import { platformConnectionCreateSchema, platformConnectionUpdateSchema } from '@ghost/shared';
import { migratePlatformUserId } from '../../core/migrate-platform-user-id.js';
const PLATFORM_META = [
    { id: 'all', name: 'All Platforms', platform: 'all', label: 'ALL', color: 'bg-orange-500' },
    { id: 'wa', name: 'WhatsApp Team', platform: 'whatsapp', label: 'WA', color: 'bg-green-500' },
    { id: 'tg', name: 'Telegram Dev', platform: 'telegram', label: 'TG', color: 'bg-blue-500' },
    { id: 'sl', name: 'Slack Client', platform: 'slack', label: 'SLACK', color: 'bg-purple-500' },
    { id: 'web', name: 'Web UI', platform: 'web', label: 'WEB', color: 'bg-orange-500' },
];
export async function platformsModule(app) {
    app.get('/settings/platforms/meta', async () => PLATFORM_META);
    app.get('/settings/webhook-urls', async (req) => {
        const host = req.headers.host ?? 'localhost:8000';
        const proto = req.headers['x-forwarded-proto'] ?? 'http';
        const base = `${proto}://${host}`;
        return {
            telegram: `${base}/api/webhook/telegram`,
            slack: `${base}/api/webhook/slack`,
            whatsapp: `${base}/api/webhook/whatsapp`,
        };
    });
    app.post('/settings/platforms/test', { preHandler: [app.authenticate] }, async (req) => {
        const { platform } = req.body;
        const conn = await db.platformConnection.findFirst({
            where: {
                userId: req.userId,
                platform,
            },
        });
        if (conn?.credentialsEncrypted) {
            const raw = decrypt(conn.credentialsEncrypted);
            let creds;
            try {
                creds = JSON.parse(raw);
            }
            catch {
                if (raw)
                    creds = { botToken: raw, accessToken: raw };
            }
            if (creds)
                return platformService.testConnection(platform, creds);
        }
        return platformService.testConnection(platform);
    });
    app.get('/settings/platforms', { preHandler: [app.authenticate] }, async (req) => {
        const rows = await db.platformConnection.findMany({
            where: { userId: req.userId },
        });
        return rows;
    });
    app.post('/settings/platforms', { preHandler: [app.authenticate] }, async (req, reply) => {
        let body;
        try {
            body = validate(platformConnectionCreateSchema, req.body);
        }
        catch (err) {
            if (err instanceof ValidationError)
                return sendValidationError(reply, err);
            throw err;
        }
        const { platform, credentials, platform_user_id } = body;
        const existing = await db.platformConnection.findFirst({
            where: {
                userId: req.userId,
                platform,
            },
        });
        if (existing) {
            reply.status(400).send({ detail: `Platform '${platform}' already connected` });
            return;
        }
        const conn = await db.platformConnection.create({
            data: {
                userId: req.userId,
                platform,
                credentialsEncrypted: encrypt(credentials ?? ''),
                platformUserId: platform_user_id,
            }
        });
        reply.status(201).send(conn);
    });
    app.put('/settings/platforms/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { id } = req.params;
        const existing = await db.platformConnection.findFirst({
            where: {
                id: Number(id),
                userId: req.userId,
            },
        });
        if (!existing) {
            reply.status(404).send({ detail: 'Platform connection not found' });
            return;
        }
        let body;
        try {
            body = validate(platformConnectionUpdateSchema, req.body);
        }
        catch (err) {
            if (err instanceof ValidationError)
                return sendValidationError(reply, err);
            throw err;
        }
        const updateData = {};
        if (body.platform_user_id !== undefined) {
            updateData.platformUserId = body.platform_user_id;
        }
        if (body.is_active !== undefined) {
            updateData.isActive = body.is_active;
        }
        if (Object.keys(updateData).length === 0) {
            reply.status(400).send({ detail: 'No fields to update' });
            return;
        }
        const updated = await db.platformConnection.update({
            where: { id: Number(id) },
            data: updateData,
        });
        reply.send(updated);
    });
    app.post('/settings/platforms/migrate', { preHandler: [app.authenticate] }, async (req) => {
        const report = await migratePlatformUserId(req.userId);
        return {
            message: report.total === 0
                ? 'All your platform connections already have platformUserId set.'
                : `Migration complete. ${report.updated} backfilled, ${report.skipped} need manual input.`,
            report,
        };
    });
}
//# sourceMappingURL=index.js.map