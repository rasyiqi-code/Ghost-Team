export interface MigrationReport {
    total: number;
    updated: number;
    skipped: number;
    details: {
        id: number;
        userId: number;
        platform: string;
        action: 'backfilled' | 'needs_input' | 'already_set';
        platformUserId: string | null;
        source?: string;
    }[];
}
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
export declare function migratePlatformUserId(userId?: number): Promise<MigrationReport>;
//# sourceMappingURL=migrate-platform-user-id.d.ts.map