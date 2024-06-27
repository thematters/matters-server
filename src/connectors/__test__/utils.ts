import type { PaymentService } from 'connectors'
import type { Connections } from 'definitions'

// @ts-ignore
import initDatabase from '@root/db/initDatabase'
import Redis from 'ioredis-mock'
import { genRandomString } from 'common/utils'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'

export const genConnections = async (): Promise<Connections> => {
  const database = 'test_matters_' + genRandomString()
  const knex = await initDatabase(database)

  const redis = new Redis()

  return {
    knex: knex,
    knexRO: knex,
    knexSearch: knex,
    redis,
  }
}

export const closeConnections = async (connections: Connections) => {
  await connections.knex.destroy()
}

export const createDonationTx = async (
  {
    senderId,
    recipientId,
    targetId,
  }: {
    senderId: string
    recipientId: string
    targetId?: string
  },
  paymentService: PaymentService
) =>
  createTx(
    {
      senderId,
      recipientId,
      purpose: TRANSACTION_PURPOSE.donation,
      currency: PAYMENT_CURRENCY.HKD,
      state: TRANSACTION_STATE.succeeded,
      targetId,
    },
    paymentService
  )

export const createTx = async (
  {
    senderId,
    recipientId,
    purpose,
    currency,
    state,
    targetId,
  }: {
    senderId: string
    recipientId: string
    purpose: TRANSACTION_PURPOSE
    currency: keyof typeof PAYMENT_CURRENCY
    state: TRANSACTION_STATE
    targetId?: string
  },
  paymentService: PaymentService
) => {
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
    targetId: targetId ?? '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })
}
