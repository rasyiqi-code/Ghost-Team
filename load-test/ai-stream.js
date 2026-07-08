import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:3000'
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''

export const options = {
  stages: [
    { duration: '10s', target: 3 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000', 'p(99)<15000'], // Streaming lebih lambat
    http_req_failed: ['rate<0.05'],                    // Allow 5% failure
  },
}

const errorRate = new Rate('errors')
const streamDuration = new Trend('stream_duration')

export default function () {
  const payload = JSON.stringify({
    messages: [
      { role: 'system', content: 'Kamu adalah asisten AI yang membantu tim.' },
      { role: 'user', content: 'Berikan ringkasan singkat tentang AI.' },
    ],
  })

  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }

  const res = http.post(`${API_URL}/api/ai/chat/stream`, payload, params)

  const ok = check(res, {
    'ai stream: status 200': (r) => r.status === 200,
    'ai stream: response is SSE': (r) => {
      const ct = r.headers['Content-Type'] || ''
      return ct.includes('text/event-stream') || ct.includes('text/plain')
    },
  })

  if (!ok) {
    errorRate.add(1)
  }

  streamDuration.add(res.timings.duration)

  sleep(3) // Jeda lebih lama karena streaming lebih berat
}
