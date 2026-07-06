import { env } from '@ghost/config';
let redisAvailable = false;
let queue = [];
let processing = false;
async function processQueue() {
    if (processing || queue.length === 0)
        return;
    processing = true;
    while (queue.length > 0) {
        const task = queue.shift();
        try {
            const result = await task.handler(...task.args);
            task.resolve(result);
        }
        catch (err) {
            task.reject(err);
        }
    }
    processing = false;
}
function enqueue(handler, args) {
    return new Promise((resolve, reject) => {
        queue.push({ id: crypto.randomUUID(), handler, args, resolve, reject });
        setImmediate(processQueue);
    });
}
let bullQueue = null;
async function initBullQueue() {
    try {
        const { Queue, Worker } = await import('bullmq');
        const IORedis = (await import('ioredis')).default;
        const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
        await connection.ping();
        redisAvailable = true;
        const q = new Queue('ghost-tasks', { connection });
        new Worker('ghost-tasks', async (job) => {
            const { handlerName, args } = job.data;
            const handler = taskRegistry.get(handlerName);
            if (!handler)
                throw new Error(`Unknown task: ${handlerName}`);
            return handler(...args);
        }, { connection });
        bullQueue = {
            enqueue: async (handler, args) => {
                const handlerName = handler.name || 'anonymous';
                return q.add(handlerName, { handlerName, args });
            },
        };
        return bullQueue;
    }
    catch {
        return null;
    }
}
const taskRegistry = new Map();
export function registerTask(name, handler) {
    taskRegistry.set(name, handler);
}
export async function getTaskQueue() {
    if (redisAvailable && bullQueue)
        return bullQueue;
    const bq = await initBullQueue();
    if (bq)
        return bq;
    return { enqueue };
}
//# sourceMappingURL=task-queue.js.map