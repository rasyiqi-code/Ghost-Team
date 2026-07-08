import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:3000'
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up ke 10 VU
    { duration: '1m', target: 20 },   // Naik ke 20 VU
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    messages_load_duration: ['p(95)<3000'],
  },
}

const errorRate = new Rate('errors')
const messagesTrend = new Trend('messages_load_duration')

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }

  // Test 1: List messages (default)
  {
    const res = http.get(`${API_URL}/api/messages?limit=50`, params)
    messagesTrend.add(res.timings.duration)

    const ok = check(res, {
      'messages: status 200': (r) => r.status === 200,
      'messages: has messages array': (r) => {
        const body = JSON.parse(r.body)
        return Array.isArray(body.messages)
      },
    })

    if (!ok) errorRate.add(1)
  }

  sleep(1)

  // Test 2: Filter by platform
  {
    const res = http.get(`${API_URL}/api/messages?platform=web&limit=20`, params)
    const ok = check(res, {
      'messages by platform: status 200': (r) => r.status === 200,
    })
    if (!ok) errorRate.add(1)
  }

  sleep(0.5)

  // Test 3: Search messages
  {
    const res = http.get(`${API_URL}/api/messages?search=test&limit=10`, params)
    const ok = check(res, {
      'messages search: status 200': (r) => r.status === 200 || r.status === 404,
    })
    if (!ok) errorRate.add(1)
  }

  sleep(0.5)
}
