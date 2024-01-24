import type { PaymentService } from 'connectors'
import type { Connections } from 'definitions'

// @ts-ignore
import initDatabase from '@root/db/initDatabase'
import Redis from 'ioredis-mock'
import { v4 } from 'uuid'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  PUBLISH_STATE,
  ARTICLE_STATE,
} from 'common/enums'
import { ArticleService, DraftService } from 'connectors'

export const genConnections = async (): Promise<Connections> => {
  const randomString = Buffer.from(Math.random().toString())
    .toString('base64')
    .substring(10, 15)
  const database = 'test_matters_' + randomString
  const knexClient = await initDatabase(database)

  const redis = new Redis()

  return {
    knex: knexClient,
    knexRO: knexClient,
    knexSearch: knexClient,
    redis,
  }
}

export const closeConnections = async (connections: Connections) => {
  await connections.knex.destroy()
}

export const createArticle = async (
  {
    title,
    content,
    authorId,
  }: { title: string; content: string; authorId: string },
  connections: Connections
) => {
  const articleService = new ArticleService(connections)
  const draftService = new DraftService(connections)

  const randomString = Math.random().toString()
  const dataHash = `test-data-hash-${randomString}`
  const mediaHash = `test-media-hash-${randomString}`

  const draft = await draftService.baseCreate({
    uuid: v4(),
    title,
    content,
    authorId,
    publishState: PUBLISH_STATE.published,
    dataHash,
    mediaHash,
  })
  const article = await articleService.createArticle({
    draftId: draft.id,
    authorId,
    title,
    slug: title,
    cover: '1',
    wordCount: content.length,
    summary: 'test-summary',
    content,
    dataHash,
    mediaHash,
  })
  return articleService.baseUpdate(article.id, { state: ARTICLE_STATE.active })
}

export const createDonationTx = async (
  {
    senderId,
    recipientId,
  }: {
    senderId: string
    recipientId: string
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
  }: {
    senderId: string
    recipientId: string
    purpose: TRANSACTION_PURPOSE
    currency: keyof typeof PAYMENT_CURRENCY
    state: TRANSACTION_STATE
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
    targetId: '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })
}
