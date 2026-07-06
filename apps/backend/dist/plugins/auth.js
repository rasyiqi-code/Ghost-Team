import fp from 'fastify-plugin';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../core/auth.js';
export async function authPlugin(app) {
    app.decorateRequest('userId', 0);
    app.decorate('authenticate', async function (request, reply) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(request.headers),
            });
            if (!session) {
                reply.status(401).send({ detail: 'Invalid or expired session' });
                return;
            }
            request.userId = Number(session.user.id);
        }
        catch {
            reply.status(401).send({ detail: 'Authentication failed' });
        }
    });
}
export default fp(authPlugin, { name: 'auth' });
//# sourceMappingURL=auth.js.map