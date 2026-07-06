import { db } from '@ghost/database';
/**
 * Populates `platformUserId` for existing platform connections where it is NULL.
 *
 * - **Telegram**: backfills from the most recent message's `senderId` (the chat.id
 *   in 1-on-1 conversations with the bot).
 * - **WhatsApp / Slack**: cannot be reliably backfilled — the connection is flagged
 *   as `needs_input` so the user can provide the value via the PUT endpoint.
 *
 * @param userId - If provided, only migrates connections belonging to this user.
 */
export async function migratePlatformUserId(userId) {
    const whereClause = { platformUserId: null };
    if (userId !== undefined) {
        whereClause.userId = userId;
    }
    const allConnections = await db.platformConnection.findMany({
        where: whereClause,
    });
    const report = {
        total: allConnections.length,
        updated: 0,
        skipped: 0,
        details: [],
    };
    for (const conn of allConnections) {
        switch (conn.platform) {
            case 'telegram': {
                // The senderId in Telegram private chats IS the chat.id
                const lastMsg = await db.message.findFirst({
                    where: { userId: conn.userId },
                    orderBy: { timestamp: 'desc' },
                    select: { senderId: true },
                });
                if (lastMsg?.senderId) {
                    await db.platformConnection.update({
                        where: { id: conn.id },
                        data: { platformUserId: lastMsg.senderId },
                    });
                    report.updated++;
                    report.details.push({
                        id: conn.id,
                        userId: conn.userId,
                        platform: conn.platform,
                        action: 'backfilled',
                        platformUserId: lastMsg.senderId,
                        source: `last telegram message senderId`,
                    });
                }
                else {
                    report.skipped++;
                    report.details.push({
                        id: conn.id,
                        userId: conn.userId,
                        platform: conn.platform,
                        action: 'needs_input',
                        platformUserId: null,
                        source: 'no telegram messages found — send a message to the bot first, then re-run migration',
                    });
                }
                break;
            }
            case 'whatsapp': {
                // Cannot backfill — the business phone number is not stored in messages
                report.skipped++;
                report.details.push({
                    id: conn.id,
                    userId: conn.userId,
                    platform: conn.platform,
                    action: 'needs_input',
                    platformUserId: null,
                    source: 'whatsapp — provide your WhatsApp Business phone number (e.g. 15551234567)',
                });
                break;
            }
            case 'slack': {
                // Cannot backfill — the workspace team_id is not stored in messages
                report.skipped++;
                report.details.push({
                    id: conn.id,
                    userId: conn.userId,
                    platform: conn.platform,
                    action: 'needs_input',
                    platformUserId: null,
                    source: 'slack — provide your Slack workspace ID (visible in Slack admin → Settings → Workspace ID)',
                });
                break;
            }
            default: {
                report.skipped++;
                report.details.push({
                    id: conn.id,
                    userId: conn.userId,
                    platform: conn.platform,
                    action: 'needs_input',
                    platformUserId: null,
                    source: `unknown platform '${conn.platform}' — manual input required`,
                });
                break;
            }
        }
    }
    return report;
}
//# sourceMappingURL=migrate-platform-user-id.js.map