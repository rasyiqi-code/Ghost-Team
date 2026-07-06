import type { FastifyInstance } from 'fastify';
export declare function authPlugin(app: FastifyInstance): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare const _default: typeof authPlugin;
export default _default;
//# sourceMappingURL=auth.d.ts.map