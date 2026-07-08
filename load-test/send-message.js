import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:3000'
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
  },
}

const errorRate = new Rate('errors')

export default function () {
  const payload = JSON.stringify({
    platform: 'web',
    receiver_id: '',
    content: `Load test message at ${Date.now()}`,
  })

  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }

  const res = http.post(`${API_URL}/api/messages/send`, payload, params)

  const ok = check(res, {
    'send message: status 200/201': (r) => r.status === 200 || r.status === 201,
  })

  if (!ok) errorRate.add(1)

  sleep(Math.random() * 2 + 1) // Simulasi jeda antar pengiriman
}
