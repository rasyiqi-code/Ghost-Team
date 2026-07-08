/**
 * CI-friendly k6 load test — hanya menguji endpoint health
 * yang tidak memerlukan autentikasi.
 *
 * Thresholds ketat untuk mendeteksi regresi performa.
 * Jika p(95) > 200ms, CI akan gagal.
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:8000'

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 10 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500', 'avg<100'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
}

const healthTrend = new Trend('health_response_ms')
const errorRate = new Rate('ci_errors')

export default function () {
  const res = http.get(`${API_URL}/api/health`)
  healthTrend.add(res.timings.duration)

  const checks = {
    'status is 200': (r) => r.status === 200,
    'body has status field': (r) => {
      try {
        return JSON.parse(r.body).status !== undefined
      } catch { return false }
    },
    'body has checks.database': (r) => {
      try {
        return JSON.parse(r.body).checks?.database !== undefined
      } catch { return false }
    },
    'body has memory fields': (r) => {
      try {
        const m = JSON.parse(r.body).memory
        return m?.rss && m?.heapUsed
      } catch { return false }
    },
  }

  const ok = check(res, checks)
  if (!ok) errorRate.add(1)

  sleep(0.2)
}
