export interface MessageCreatedEvent {
    id: number;
    userId: number;
    platform: string;
    content: string | null;
    senderName: string | null;
    messageType: string;
    isOutgoing: boolean;
    timestamp: string;
}
export interface VoiceProcessedEvent {
    id: number;
    status: string;
    transcription?: string;
    summary?: string;
}
export interface FileIndexedEvent {
    fileId: number;
    status: string;
    folder?: string;
}
export interface AutoReplyEvent {
    status: string;
    answer: string | null;
    source: string;
    sender: string;
    platform: string;
    originalQuestion: string;
}
declare class AppEventBus {
    private emitter;
    on(event: 'message:created', handler: (data: MessageCreatedEvent) => void): void;
    on(event: 'voice:processed', handler: (data: VoiceProcessedEvent) => void): void;
    on(event: 'file:indexed', handler: (data: FileIndexedEvent) => void): void;
    on(event: 'auto:reply', handler: (data: AutoReplyEvent) => void): void;
    emit(event: 'message:created', data: MessageCreatedEvent): void;
    emit(event: 'voice:processed', data: VoiceProcessedEvent): void;
    emit(event: 'file:indexed', data: FileIndexedEvent): void;
    emit(event: 'auto:reply', data: AutoReplyEvent): void;
}
export declare const eventBus: AppEventBus;
export {};
//# sourceMappingURL=event-bus.d.ts.map