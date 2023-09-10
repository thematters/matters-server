import type { Connections } from 'definitions'

import { Redis } from 'ioredis'
import { knex } from 'knex'
import { RedisMemoryServer } from 'redis-memory-server'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { PaymentService } from 'connectors'

// @ts-ignore
import knexConfig from '../../../knexfile'

const redisServer = new RedisMemoryServer()
const knexClient = knex(knexConfig.test)

export const genConnections = async (): Promise<Connections> => {
  const redisPort = await redisServer.getPort()
  const redisHost = await redisServer.getHost()
  const redis = new Redis(redisPort, redisHost, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
  return {
    redis,
    knex: knexClient,
    knexRO: knexClient,
    knexSearch: knexClient,
  }
}

export const createDonationTx = async ({
  senderId,
  recipientId,
}: {
  senderId: string
  recipientId: string
}) =>
  createTx({
    senderId,
    recipientId,
    purpose: TRANSACTION_PURPOSE.donation,
    currency: PAYMENT_CURRENCY.HKD,
    state: TRANSACTION_STATE.succeeded,
  })

export const createTx = async ({
  senderId,
  recipientId,
  purpose,
  currency,
  state,
}: {
  senderId: string
  recipientId: string
  purpose: TRANSACTION_PURPOSE
  currency: keyof typeof PAYMENT_CURRENCY
  state: TRANSACTION_STATE
}) => {
  const paymentService = new PaymentService(await genConnections())
  return paymentService.createTransaction({
    amount: 1,
    fee: 0,
    purpose,
    currency,
    state,
    provider: PAYMENT_PROVIDER.matters,
    providerTxId: String(Math.random()),
    recipientId,
    senderId,
    targetId: '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })
}
