import { db } from '@ghost/database';
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] ** 2;
        normB += b[i] ** 2;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
class PersistentVectorStore {
    async addChat(id, embedding, document, metadata) {
        await db.embedding.upsert({
            where: {
                referenceId_collection: {
                    referenceId: id,
                    collection: 'chat_memory',
                }
            },
            update: {
                embedding: embedding,
                document,
                metadata: metadata,
            },
            create: {
                userId: Number(metadata.userId ?? 0),
                referenceId: id,
                collection: 'chat_memory',
                document,
                embedding: embedding,
                metadata: metadata,
            }
        });
    }
    async searchChat(queryEmbedding, topK, where) {
        let rows = await db.embedding.findMany({
            where: { collection: 'chat_memory' }
        });
        if (where) {
            rows = rows.filter(row => {
                const meta = (row.metadata ?? {});
                return Object.entries(where).every(([k, v]) => String(meta[k]) === v);
            });
        }
        const scored = rows.map(row => ({
            id: row.referenceId,
            content: row.document,
            metadata: (row.metadata ?? {}),
            similarity: cosineSimilarity(queryEmbedding, row.embedding),
        }));
        scored.sort((a, b) => b.similarity - a.similarity);
        return scored.slice(0, topK);
    }
    async addFile(id, embedding, document, metadata) {
        await db.embedding.upsert({
            where: {
                referenceId_collection: {
                    referenceId: id,
                    collection: 'knowledge_vault',
                }
            },
            update: {
                embedding: embedding,
                document,
                metadata: metadata,
            },
            create: {
                userId: Number(metadata.userId ?? 0),
                referenceId: id,
                collection: 'knowledge_vault',
                document,
                embedding: embedding,
                metadata: metadata,
            }
        });
    }
    async searchVault(queryEmbedding, topK, where) {
        let rows = await db.embedding.findMany({
            where: { collection: 'knowledge_vault' }
        });
        if (where) {
            rows = rows.filter(row => {
                const meta = (row.metadata ?? {});
                return Object.entries(where).every(([k, v]) => String(meta[k]) === v);
            });
        }
        const scored = rows.map(row => ({
            id: row.referenceId,
            content: row.document,
            metadata: (row.metadata ?? {}),
            similarity: cosineSimilarity(queryEmbedding, row.embedding),
        }));
        scored.sort((a, b) => b.similarity - a.similarity);
        return scored.slice(0, topK);
    }
}
export const memoryStore = new PersistentVectorStore();
//# sourceMappingURL=memory-store.js.map