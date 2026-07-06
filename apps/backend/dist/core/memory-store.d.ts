export interface QueryResult {
    id: string;
    content: string;
    metadata: Record<string, string>;
    similarity: number;
}
declare class PersistentVectorStore {
    addChat(id: string, embedding: number[], document: string, metadata: Record<string, string>): Promise<void>;
    searchChat(queryEmbedding: number[], topK: number, where?: Record<string, string>): Promise<QueryResult[]>;
    addFile(id: string, embedding: number[], document: string, metadata: Record<string, string>): Promise<void>;
    searchVault(queryEmbedding: number[], topK: number, where?: Record<string, string>): Promise<QueryResult[]>;
}
export declare const memoryStore: PersistentVectorStore;
export {};
//# sourceMappingURL=memory-store.d.ts.map