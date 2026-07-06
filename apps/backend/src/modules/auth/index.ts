import type { FastifyInstance } from 'fastify'
import { auth } from '../../core/auth.js'

export async function authModule(app: FastifyInstance): Promise<void> {
  app.all('/*', async (request, reply) => {
    const method = request.method
    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else if (value) {
        headers.set(key, value)
      }
    }

    const url = `${request.protocol}://${request.hostname}${request.url}`
    let body: string | undefined = undefined
    if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
      body = JSON.stringify(request.body)
    }

    const webReq = new Request(url, {
      method,
      headers,
      body,
    })

    const webRes = await auth.handler(webReq)

    reply.status(webRes.status)
    webRes.headers.forEach((value, key) => {
      // Don't forward transfer-encoding header to avoid Fastify chunking conflicts
      if (key.toLowerCase() !== 'transfer-encoding') {
        reply.header(key, value)
      }
    })

    return reply.send(await webRes.text())
  })
}
