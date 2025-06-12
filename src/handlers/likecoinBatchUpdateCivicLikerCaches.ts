import type { APIGatewayProxyResult } from 'aws-lambda'

import { LikeCoin } from '#connectors/index.js'

import { connections } from '../connections.js'

type Event = Array<{
  id: string
  expires: number // unix timestamp
}>

const likecoin = new LikeCoin(connections)

export const handler = async (event: Event): Promise<APIGatewayProxyResult> => {
  console.log(event)

  if (!validate(event)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Unexpected input.',
      }),
    }
  }

  const oneday = 86400

  try {
    await likecoin.updateCivicLikerCaches(
      event.map(({ id, expires }) => {
        const ttl = getTTL(expires)

        return {
          likerId: id,
          expire: ttl === 0 ? 1 : ttl + oneday, //  zero expire is invalid for redis
        }
      })
    )
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'succeeded.',
      }),
    }
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
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
