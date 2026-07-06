import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
export declare function socketPlugin(app: FastifyInstance): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        io: SocketIOServer;
        emitToUser: (userId: number, event: string, data: unknown) => void;
    }
}
declare const _default: typeof socketPlugin;
export default _default;
//# sourceMappingURL=socket.d.ts.map