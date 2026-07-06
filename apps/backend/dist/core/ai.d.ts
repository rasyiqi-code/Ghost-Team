export declare function chatCompletion(model: string, messages: {
    role: string;
    content: string;
}[], options?: {
    temperature?: number;
    responseFormat?: {
        type: string;
    };
    userId?: number;
}): Promise<string>;
export declare function transcribeAudio(audioPath: string, userId?: number): Promise<string>;
export declare function generateEmbedding(text: string, userId?: number): Promise<number[]>;
export declare function summarizeText(text: string, userId?: number): Promise<string>;
export declare function decomposeTasks(text: string, userId?: number): Promise<Record<string, unknown>>;
export declare function generateAutoReply(question: string, context: string[], userId?: number): Promise<string>;
export declare function classifyFolder(filename: string, chatContext: string, userId?: number): Promise<string>;
export declare function extractIntent(commandText: string, userId?: number): Promise<Record<string, string>>;
export declare function listAvailableModels(userId?: number): Promise<{
    id: string;
    providerBaseURL: string;
    ownedBy: string;
}[]>;
//# sourceMappingURL=ai.d.ts.map