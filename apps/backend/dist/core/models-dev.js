const CATALOG_URL = 'https://models.dev/catalog.json';
const CACHE_TTL = 3600_000;
let cache = {
    catalog: null,
    fetchedAt: null,
};
async function fetchCatalog() {
    const resp = await fetch(CATALOG_URL);
    if (!resp.ok)
        throw new Error(`Failed to fetch catalog: ${resp.status}`);
    return resp.json();
}
async function getCatalog() {
    const now = Date.now();
    if (cache.catalog && cache.fetchedAt && (now - cache.fetchedAt) < CACHE_TTL) {
        return cache.catalog;
    }
    const catalog = await fetchCatalog();
    cache.catalog = catalog;
    cache.fetchedAt = now;
    return catalog;
}
export function invalidateCache() {
    cache.catalog = null;
    cache.fetchedAt = null;
}
export async function getAllModels() {
    const catalog = await getCatalog();
    return catalog.models;
}
export async function searchModels(query, family) {
    const models = await getAllModels();
    let entries = Object.values(models);
    if (query) {
        const q = query.toLowerCase();
        entries = entries.filter(m => m.id?.toLowerCase().includes(q) ||
            m.name?.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q));
    }
    if (family) {
        entries = entries.filter(m => m.family === family);
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
}
export async function getModelFamilies() {
    const models = await getAllModels();
    const families = new Set();
    for (const m of Object.values(models)) {
        if (m.family)
            families.add(m.family);
    }
    return [...families].sort();
}
export async function getAllProviders() {
    const catalog = await getCatalog();
    return catalog.providers;
}
export async function searchProviders(query) {
    const providers = await getAllProviders();
    let entries = Object.values(providers);
    if (query) {
        const q = query.toLowerCase();
        entries = entries.filter(p => p.id?.toLowerCase().includes(q) ||
            p.name?.toLowerCase().includes(q));
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
}
export async function getProviderModels(providerId) {
    const providers = await getAllProviders();
    const provider = providers[providerId];
    if (!provider)
        return [];
    const models = Object.values(provider.models);
    return models.sort((a, b) => ((a.id ?? a.name) ?? '').localeCompare(b.id ?? b.name ?? ''));
}
//# sourceMappingURL=models-dev.js.map