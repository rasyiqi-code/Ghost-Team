import { env } from '@ghost/config';
import { getSetting, setSetting, deleteSetting, invalidateCache } from '../../core/db-settings.js';
import { encrypt } from '../../core/encryption.js';
const EDITABLE_KEYS = [
    'STORAGE_DIR',
];
const envDefaults = {
    STORAGE_DIR: env.STORAGE_DIR,
};
export async function settingsModule(app) {
    app.get('/settings/env', { preHandler: [app.authenticate] }, async () => {
        const result = [];
        for (const key of EDITABLE_KEYS) {
            const dbVal = await getSetting(key);
            const envVal = envDefaults[key];
            if (dbVal !== null) {
                result.push({ key, value: dbVal, source: 'db' });
            }
            else if (envVal) {
                result.push({ key, value: envVal, source: 'env' });
            }
            else {
                result.push({ key, value: '', source: 'builtin' });
            }
        }
        return result;
    });
    app.post('/settings/env', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { key, value } = req.body;
        if (!EDITABLE_KEYS.includes(key)) {
            reply.status(400).send({ detail: `Key '${key}' is not editable` });
            return;
        }
        await setSetting(key, value ?? '');
        invalidateCache();
        return { status: 'ok', key, value };
    });
    app.delete('/settings/env/:key', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { key } = req.params;
        if (!EDITABLE_KEYS.includes(key)) {
            reply.status(400).send({ detail: `Key '${key}' is not editable` });
            return;
        }
        await deleteSetting(key);
        invalidateCache();
        return { status: 'ok', key };
    });
    app.post('/settings/onboarding', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { workspaceName, workspacePurpose, workspaceContext, invitedEmails, aiProvider, aiApiKey, aiModel, aiEmbeddingModel, aiAudioModel, aiBaseUrl, } = req.body;
        await setSetting('workspace_name', workspaceName || '');
        await setSetting('workspace_purpose', workspacePurpose || '');
        await setSetting('workspace_context', workspaceContext || '');
        await setSetting('workspace_invited_emails', Array.isArray(invitedEmails) ? invitedEmails.join(',') : '');
        if (aiProvider && aiApiKey) {
            const types = ['chat', 'embedding', 'audio'];
            for (const type of types) {
                const existing = await app.db.aIProvider.findFirst({
                    where: {
                        userId: req.userId,
                        providerType: type
                    }
                });
                let modelId = aiModel || '';
                if (type === 'embedding') {
                    modelId = aiEmbeddingModel || '';
                }
                else if (type === 'audio') {
                    modelId = aiAudioModel || '';
                }
                const payload = {
                    userId: req.userId,
                    providerType: type,
                    name: aiProvider,
                    apiBaseUrl: aiBaseUrl || '',
                    apiKey: encrypt(aiApiKey),
                    modelId,
                    isActive: true
                };
                if (existing) {
                    await app.db.aIProvider.update({
                        where: { id: existing.id },
                        data: payload
                    });
                }
                else {
                    await app.db.aIProvider.create({
                        data: payload
                    });
                }
            }
        }
        invalidateCache();
        return { status: 'ok' };
    });
    app.post('/settings/fetch-models', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { apiKey, baseUrl } = req.body;
        if (!apiKey || !baseUrl) {
            reply.status(400).send({ detail: 'API Key and Base URL are required' });
            return;
        }
        try {
            // Ensure the endpoint is correctly formatted
            let url = baseUrl;
            if (!url.endsWith('/models') && !url.endsWith('/models/')) {
                url = url.endsWith('/') ? `${url}models` : `${url}/models`;
            }
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            if (!res.ok) {
                throw new Error(`Provider returned status ${res.status}`);
            }
            const data = (await res.json());
            const models = data.data ? data.data.map((m) => m.id) : [];
            return { models };
        }
        catch (err) {
            reply.status(500).send({ detail: err.message || 'Failed to fetch models' });
        }
    });
    app.get('/settings/models-catalog', { preHandler: [app.authenticate] }, async () => {
        const catalog = await fetchCatalog();
        if (!catalog || !catalog.providers) {
            return { providers: [] };
        }
        const providers = Object.values(catalog.providers).map((p) => {
            return {
                id: p.id,
                name: p.name,
                api: p.api || '',
                models: p.models ? Object.keys(p.models) : []
            };
        });
        return { providers };
    });
}
let catalogCache = null;
let catalogLastFetched = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour
async function fetchCatalog() {
    const now = Date.now();
    if (!catalogCache || now - catalogLastFetched > CACHE_TTL) {
        try {
            const res = await fetch('https://models.dev/catalog.json');
            if (res.ok) {
                catalogCache = await res.json();
                catalogLastFetched = now;
            }
        }
        catch (err) {
            console.error('Failed to fetch models.dev catalog:', err);
        }
    }
    return catalogCache;
}
//# sourceMappingURL=index.js.map