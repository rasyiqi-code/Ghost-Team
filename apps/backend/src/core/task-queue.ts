import { env } from '@ghost/config'

type TaskHandler = (...args: unknown[]) => Promise<unknown>

interface Task {
  id: string
  handler: TaskHandler
  args: unknown[]
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

let redisAvailable = false
let queue: Task[] = []
let processing = false

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return
  processing = true
  while (queue.length > 0) {
    const task = queue.shift()!
    try {
      const result = await task.handler(...task.args)
      task.resolve(result)
    } catch (err) {
      task.reject(err)
    }
  }
  processing = false
}

function enqueue(handler: TaskHandler, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    queue.push({ id: crypto.randomUUID(), handler, args, resolve, reject })
    setImmediate(processQueue)
  })
}

export interface TaskQueue {
  enqueue(handler: TaskHandler, args: unknown[]): Promise<unknown>
}

let bullQueue: TaskQueue | null = null

async function initBullQueue(): Promise<TaskQueue | null> {
  try {
    const { Queue, Worker } = await import('bullmq')
    const IORedis = (await import('ioredis')).default
    const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) as any
    await connection.ping()
    redisAvailable = true
    const q = new Queue('ghost-tasks', { connection })

    new Worker('ghost-tasks', async (job) => {
      const { handlerName, args } = job.data
      const handler = taskRegistry.get(handlerName)
      if (!handler) throw new Error(`Unknown task: ${handlerName}`)
      return handler(...args)
    }, { connection })

    bullQueue = {
      enqueue: async (handler, args) => {
        const handlerName = handler.name || 'anonymous'
        return q.add(handlerName, { handlerName, args })
      },
    }
    return bullQueue
  } catch {
    return null
  }
}

const taskRegistry = new Map<string, TaskHandler>()

export function registerTask(name: string, handler: TaskHandler): void {
  taskRegistry.set(name, handler)
}

export async function getTaskQueue(): Promise<TaskQueue> {
  if (redisAvailable && bullQueue) return bullQueue
  const bq = await initBullQueue()
  if (bq) return bq
  return { enqueue }
}
