import { db } from '@ghost/database';
import { platformService } from '../../core/platform-service.js';
import { eventBus } from '../../core/event-bus.js';
import { validate, sendValidationError, ValidationError } from '../../core/validation.js';
import { messageCreateSchema, messageSearchSchema } from '@ghost/shared';
let socketIO;
export async function messagesModule(app) {
    socketIO = app.io;
    app.get('/messages', { preHandler: [app.authenticate] }, async (req) => {
        const { page = '1', page_size = '50', platform } = req.query;
        const pageNum = Math.max(1, Number(page));
        const limit = Math.min(200, Math.max(1, Number(page_size)));
        const offset = (pageNum - 1) * limit;
        const userId = req.userId;
        const filter = { userId };
        if (platform)
            filter.platform = platform;
        const total = await db.message.count({ where: filter });
        const rows = await db.message.findMany({
            where: filter,
            orderBy: { timestamp: 'desc' },
            skip: offset,
            take: limit,
        });
        return { messages: rows, total, page: pageNum, pageSize: limit };
    });
    app.post('/messages/send', { preHandler: [app.authenticate] }, async (req, reply) => {
        let body;
        try {
            body = validate(messageCreateSchema, req.body);
        }
        catch (err) {
            if (err instanceof ValidationError)
                return sendValidationError(reply, err);
            throw err;
        }
        const { platform, receiver_id, content, message_type = 'text' } = body;
        const userId = req.userId;
        const user = await db.user.findFirst({ where: { id: userId } });
        const msg = await db.message.create({
            data: {
                userId,
                platform,
                senderId: String(userId),
                senderName: user?.name ?? '',
                content,
                messageType: message_type,
                isOutgoing: true,
            }
        });
        try {
            socketIO.to(`user:${msg.userId}`).emit('new_message', msg);
        }
        catch { /* ws skip */ }
        eventBus.emit('message:created', {
            id: msg.id,
            userId: msg.userId,
            platform: msg.platform,
            content: msg.content ?? '',
            senderName: msg.senderName ?? '',
            messageType: msg.messageType,
            isOutgoing: msg.isOutgoing,
            timestamp: String(msg.timestamp),
        });
        if (platform !== 'web') {
            try {
                await platformService.sendMessage(platform, receiver_id, content ?? '');
            }
            catch { /* skip */ }
        }
        reply.status(201).send(msg);
    });
    app.post('/messages/search', { preHandler: [app.authenticate] }, async (req, reply) => {
        let body;
        try {
            body = validate(messageSearchSchema, req.body);
        }
        catch (err) {
            if (err instanceof ValidationError)
                return sendValidationError(reply, err);
            throw err;
        }
        const { query, page = 1, page_size = 50 } = body;
        const userId = req.userId;
        const pageNum = Math.max(1, Number(page));
        const limit = Math.min(200, Math.max(1, Number(page_size)));
        const offset = (pageNum - 1) * limit;
        const filter = {
            userId,
            content: {
                contains: query,
                mode: 'insensitive',
            }
        };
        const total = await db.message.count({ where: filter });
        const rows = await db.message.findMany({
            where: filter,
            orderBy: { timestamp: 'desc' },
            skip: offset,
            take: limit,
        });
        return { messages: rows, total, page: pageNum, pageSize: limit };
    });
}
//# sourceMappingURL=index.js.map