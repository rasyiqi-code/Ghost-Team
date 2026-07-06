import { Server as SocketIOServer } from 'socket.io';
import fp from 'fastify-plugin';
import { decodeAccessToken } from '../core/security.js';
export async function socketPlugin(app) {
    const io = new SocketIOServer(app.server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        path: '/ws/socket.io',
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('Authentication required'));
        try {
            const payload = decodeAccessToken(token);
            socket.data.userId = Number(payload.sub);
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        console.log(`Socket connected: ${socket.id} (user=${userId})`);
        socket.join(`user:${userId}`);
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
    app.decorate('io', io);
    app.decorate('emitToUser', (userId, event, data) => {
        io.to(`user:${userId}`).emit(event, data);
    });
}
export default fp(socketPlugin, { name: 'socket' });
//# sourceMappingURL=socket.js.map