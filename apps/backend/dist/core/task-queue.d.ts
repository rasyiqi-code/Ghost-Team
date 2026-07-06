type TaskHandler = (...args: unknown[]) => Promise<unknown>;
export interface TaskQueue {
    enqueue(handler: TaskHandler, args: unknown[]): Promise<unknown>;
}
export declare function registerTask(name: string, handler: TaskHandler): void;
export declare function getTaskQueue(): Promise<TaskQueue>;
export {};
//# sourceMappingURL=task-queue.d.ts.map