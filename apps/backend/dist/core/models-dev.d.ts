interface ModelDef {
    id: string;
    name: string;
    description?: string;
    family?: string;
    attachment?: boolean;
    reasoning?: boolean;
    tool_call?: boolean;
    structured_output?: boolean;
    temperature?: boolean;
    release_date?: string;
    last_updated?: string;
    knowledge?: string;
    modalities?: {
        input?: string[];
        output?: string[];
    };
    open_weights?: boolean;
    limit?: {
        context?: number;
        output?: number;
        input?: number;
    };
    benchmarks?: string;
    license?: string;
    links?: string;
    weights?: string;
}
interface ProviderDef {
    id: string;
    name: string;
    env: string[];
    npm: string;
    api: string;
    doc: string;
    models: Record<string, ProviderModelDef>;
}
interface ProviderModelDef {
    id?: string;
    name?: string;
    cost?: {
        input?: number;
        output?: number;
        cache_read?: number;
        cache_write?: number;
        reasoning?: number;
        input_audio?: number;
        output_audio?: number;
        context_over_200k?: {
            input?: number;
            output?: number;
        };
    };
    status?: string;
    experimental?: boolean;
    reasoning_options?: unknown[];
}
export declare function invalidateCache(): void;
export declare function getAllModels(): Promise<Record<string, ModelDef>>;
export declare function searchModels(query?: string, family?: string): Promise<ModelDef[]>;
export declare function getModelFamilies(): Promise<string[]>;
export declare function getAllProviders(): Promise<Record<string, ProviderDef>>;
export declare function searchProviders(query?: string): Promise<ProviderDef[]>;
export declare function getProviderModels(providerId: string): Promise<ProviderModelDef[]>;
export {};
//# sourceMappingURL=models-dev.d.ts.map