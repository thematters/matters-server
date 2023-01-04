import http from 'k6/http'
import { SharedArray } from 'k6/data'
import { check, fail } from 'k6'

// usage:
// k6 run -e APIKEY=fake-key -e RATE=1 --duration 10s k6-meili.js

// env
const apiKey = __ENV.APIKEY || ''
const rate = +__ENV.RATE || 1

const url = 'http://meili.prod.vpc:7700/indexes/articles/search'

export function setup() {
  console.log({ url, rate })
}

export const options = {
  summaryTrendStats: [
    'avg',
    'min',
    'med',
    'max',
    'p(95)',
    'p(99)',
    'p(99.99)',
    'count',
  ],
  scenarios: {
    contacts: {
      executor: 'constant-arrival-rate',
      duration: '10s',
      rate: rate,
      timeUnit: '1s',
      preAllocatedVUs: rate,
      maxVUs: rate * 5,
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<1000'],
  },
}

const genPayload = (key) => {
  //const escaped = key.replace(/"/g, '\\"');
  const data = {
    q: key,
    limit: 30,
    filter: 'state = active',
    sort: ['numViews:desc'],
  }
  return JSON.stringify(data)
}

const splitLines = (str) => str.split(/\r?\n/)
const keys = new SharedArray('search keys', () =>
  splitLines(open('./matters-search_key-2022.txt'))
)

export default () => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  const key = keys[Math.floor(Math.random() * keys.length)]
  const result = http.post(url, genPayload(key), { headers })
  if (!check(result, { 'status code is 200': (obj) => obj.status === 200 })) {
    fail(JSON.stringify(result))
  }
}
