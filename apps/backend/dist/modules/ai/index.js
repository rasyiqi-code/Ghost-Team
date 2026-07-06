import { db } from '@ghost/database';
import { listAvailableModels } from '../../core/ai.js';
import { validate, sendValidationError, ValidationError } from '../../core/validation.js';
import { encrypt, decrypt } from '../../core/encryption.js';
import { aiProviderCreateSchema, aiProviderUpdateSchema } from '@ghost/shared';
import { searchModels, getModelFamilies, searchProviders, getProviderModels, } from '../../core/models-dev.js';
export async function aiModule(app) {
    app.get('/ai/providers', { preHandler: [app.authenticate] }, async (req) => {
        const providers = await db.aIProvider.findMany({
            where: { userId: req.userId },
        });
        return providers.map(p => ({
            ...p,
            apiKey: decrypt(p.apiKey),
        }));
    });
    app.post('/ai/providers', { preHandler: [app.authenticate] }, async (req, reply) => {
        let body;
        try {
            body = validate(aiProviderCreateSchema, req.body);
        }
        catch (err) {
            if (err instanceof ValidationError)
                return sendValidationError(reply, err);
            throw err;
        }
        const { provider_type, name, api_base_url, api_key, model_id, is_active = true } = body;
        const encryptedKey = encrypt(api_key ?? '');
        const provider = await db.aIProvider.create({
            data: {
                userId: req.userId,
                providerType: provider_type,
                name,
                apiBaseUrl: api_base_url.replace(/\/+$/, '') + '/v1',
                apiKey: encryptedKey,
                modelId: model_id,
                isActive: is_active,
            }
        });
        reply.status(201).send({ ...provider, apiKey: decrypt(provider.apiKey) });
    });
    app.put('/ai/providers/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { id } = req.params;
        let body;
        try {
            body = validate(aiProviderUpdateSchema, req.body);
        }
        catch (err) {
            if (err instanceof ValidationError)
                return sendValidationError(reply, err);
            throw err;
        }
        const existing = await db.aIProvider.findFirst({
            where: {
                id: Number(id),
                userId: req.userId,
            },
        });
        if (!existing) {
            reply.status(404).send({ detail: 'Provider not found' });
            return;
        }
        const updateData = {};
        if (body.name !== undefined)
            updateData.name = String(body.name);
        if (body.model_id !== undefined)
            updateData.modelId = String(body.model_id);
        if (body.is_active !== undefined)
            updateData.isActive = Boolean(body.is_active);
        if (body.api_key !== undefined) {
            updateData.apiKey = encrypt(String(body.api_key));
        }
        if (body.api_base_url) {
            updateData.apiBaseUrl = String(body.api_base_url).replace(/\/+$/, '') + '/v1';
        }
        const updated = await db.aIProvider.update({
            where: { id: Number(id) },
            data: updateData,
        });
        reply.send({ ...updated, apiKey: decrypt(updated.apiKey) });
    });
    app.delete('/ai/providers/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { id } = req.params;
        const existing = await db.aIProvider.findFirst({
            where: {
                id: Number(id),
                userId: req.userId,
            },
        });
        if (!existing) {
            reply.status(404).send({ detail: 'Provider not found' });
            return;
        }
        await db.aIProvider.delete({
            where: { id: Number(id) },
        });
        reply.status(204).send();
    });
    app.get('/ai/providers/models', { preHandler: [app.authenticate] }, async (req) => {
        const models = await listAvailableModels(req.userId);
        return { models };
    });
    app.get('/ai/models/browse', { preHandler: [app.authenticate] }, async (req) => {
        const { query, family } = req.query;
        const models = await searchModels(query, family);
        const families = await getModelFamilies();
        return { models, families, total: models.length };
    });
    app.get('/ai/providers/browse', { preHandler: [app.authenticate] }, async (req) => {
        const { query } = req.query;
        const providers = await searchProviders(query);
        return { providers, total: providers.length };
    });
    app.get('/ai/providers/browse/:id/models', { preHandler: [app.authenticate] }, async (req) => {
        const { id } = req.params;
        const models = await getProviderModels(id);
        return { providerId: id, models, total: models.length };
    });
    app.post('/ai/providers/test', { preHandler: [app.authenticate] }, async (req) => {
        const { api_base_url, api_key } = req.body;
        const baseURL = api_base_url.replace(/\/+$/, '') + '/v1';
        try {
            const OpenAI = (await import('openai')).default;
            const client = new OpenAI({ apiKey: api_key ?? '', baseURL });
            const models = await client.models.list();
            return {
                status: 'ok',
                modelsCount: models.data.length,
                models: models.data.slice(0, 10).map(m => m.id),
            };
        }
        catch (err) {
            return { status: 'error', detail: String(err) };
        }
    });
}
//# sourceMappingURL=index.js.map