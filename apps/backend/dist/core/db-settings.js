import { db } from '@ghost/database';
let cache = {};
let cacheLoaded = false;
async function loadCache() {
    if (cacheLoaded)
        return;
    try {
        const rows = await db.systemSetting.findMany({
            where: { isActive: true },
        });
        for (const row of rows) {
            cache[row.key] = row.value;
        }
    }
    catch { /* ignore */ }
    cacheLoaded = true;
}
export async function getSetting(key, fallback) {
    await loadCache();
    return cache[key] ?? fallback ?? null;
}
export async function setSetting(key, value) {
    const existing = await db.systemSetting.findFirst({
        where: { key },
    });
    if (existing) {
        await db.systemSetting.update({
            where: { key },
            data: { value },
        });
    }
    else {
        await db.systemSetting.create({
            data: { key, value },
        });
    }
    cache[key] = value;
}
export async function deleteSetting(key) {
    await db.systemSetting.delete({
        where: { key },
    }).catch(() => { });
    delete cache[key];
    cacheLoaded = false;
}
export function invalidateCache() {
    cacheLoaded = false;
    cache = {};
}
//# sourceMappingURL=db-settings.js.map