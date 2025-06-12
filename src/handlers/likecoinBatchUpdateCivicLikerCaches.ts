import { LikeCoin } from '#connectors/index.js'

import { connections } from '../connections.js'

type Event = {
  body?: string
  rawBody?: string
  isBase64Encoded?: boolean
}

const likecoin = new LikeCoin(connections)

type CivicLikerUpdate = {
  id: string
  expires: number // unix timestamp
}

// Usage:
// curl -X POST -H "Content-Type: application/json" -d '[{"id":"like_id1","expires":1718236800}]' https://some.lambda-url.ap-southeast-1.on.aws
export const handler = async (event: Event) => {
  console.log('body:', event.body)

  let updates: CivicLikerUpdate[] = []

  try {
    // Parse the request body
    if (event.body) {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString()
        : event.body
      updates = JSON.parse(body)
    }

    if (!validate(updates)) {
      return {
        statusCode: 400,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Unexpected input.',
        }),
      }
    }

    const oneday = 86400

    await likecoin.updateCivicLikerCaches(
      updates.map(({ id, expires }) => {
        const ttl = getTTL(expires)

        return {
          likerId: id,
          expire: ttl === 0 ? 1 : ttl + oneday, //  zero expire is invalid for redis
        }
      })
    )
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'succeeded.',
      }),
    }
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'failed.',
      }),
    }
  }
}

// return ttl in seconds
const getTTL = (expires: number): number => {
  const ttl = +new Date(expires * 1000) - +Date.now()
  return Math.ceil(Math.max(0, ttl) / 1000)
}

const validate = (event: any): boolean => {
  if (!Array.isArray(event)) {
    return false
  }
  for (const i of event) {
    if (typeof i.id !== 'string') {
      return false
    }
    if (typeof i.expires !== 'number') {
      return false
    }
    // check if unix time in seconds
    if (i.expires.toString().length !== 10) {
      return false
    }
  }
  return true
}
