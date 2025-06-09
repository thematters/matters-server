import type { PaymentService, CampaignService } from '#connectors/index.js'
import type {
  Connections,
  MaterializedView,
  Article,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import { createRequire } from 'node:module'

import pkg from 'knex'
import { knexSnakeCaseMappers } from 'objection'

// @ts-ignore
import knexConfigs from '#root/knexfile.js'
// @ts-ignore
import initDatabase from '#db/initDatabase.js'
import { genRandomString } from '#common/utils/index.js'

import {
  CAMPAIGN_STATE,
  USER_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from '#common/enums/index.js'

const { knex } = pkg

const require = createRequire(import.meta.url)
const Redis = require('ioredis-mock')

export const genConnections = async (): Promise<Connections> => {
  const database = 'test_matters_' + genRandomString()
  await initDatabase(database)

  const knexConfig = {
    ...knexConfigs.test,
  } as any
  knexConfig.connection.database = database
  knexConfig.connection.application_name = 'genConnections_' + database

  // emulate the connections object in src/routes/connections.ts
  return {
    knex: knex({
      ...knexConfig,
      ...knexSnakeCaseMappers(),
    }),
    knexRO: knex({
      ...knexConfig,
      ...knexSnakeCaseMappers(),
    }),
    knexSearch: knex({
      ...knexConfig,
      ...knexSnakeCaseMappers(),
    }),
    redis: new Redis(),
    objectCacheRedis: new Redis(),
  }
}

export const closeConnections = async (connections: Connections) => {
  await connections.knex.destroy()
  await connections.knexRO.destroy()
  await connections.knexSearch.destroy()
}

export const refreshView = async (
  view: MaterializedView,
  knex: Knex,
  createIndex = true
) => {
  if (createIndex) {
    await knex.raw(/* sql */ `
      create unique index if not exists ${view}_id on public.${view} (id);
    `)
  }
  await knex.raw(/* sql*/ `
    refresh materialized view concurrently ${view}
  `)
}

export const createDonationTx = async (
  {
    senderId,
    recipientId,
    targetId,
    currency,
    provider,
    state,
  }: {
    senderId: string
    recipientId: string
    targetId?: string
    currency?: keyof typeof PAYMENT_CURRENCY
    provider?: PAYMENT_PROVIDER
    state?: TRANSACTION_STATE
  },
  paymentService: PaymentService
) =>
  createTx(
    {
      senderId,
      recipientId,
      purpose: TRANSACTION_PURPOSE.donation,
      currency: currency ?? PAYMENT_CURRENCY.HKD,
      state: state ?? TRANSACTION_STATE.succeeded,
      provider: provider ?? PAYMENT_PROVIDER.matters,
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
    amount,
    provider,
  }: {
    senderId: string
    recipientId: string
    purpose: TRANSACTION_PURPOSE
    currency: keyof typeof PAYMENT_CURRENCY
    state: TRANSACTION_STATE
    targetId?: string
    amount?: number
    provider?: PAYMENT_PROVIDER
  },
  paymentService: PaymentService
) => {
  return paymentService.createTransaction({
    amount: amount ?? 0,
    fee: 0,
    purpose,
    currency,
    state,
    provider: provider ?? PAYMENT_PROVIDER.matters,
    providerTxId: String(Math.random()),
    recipientId,
    senderId,
    targetId: targetId ?? '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })
}

export const createCampaign = async (
  campaignService: CampaignService,
  article?: Article
) => {
  const campaign = await campaignService.createWritingChallenge({
    name: 'test',
    applicationPeriod: [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    ] as const,
    writingPeriod: [new Date('2024-01-03'), new Date('2024-01-04')] as const,
    creatorId: '1',
    state: CAMPAIGN_STATE.active,
    exclusive: true,
  })
  const stages = await campaignService.updateStages(campaign.id, [
    { name: 'stage1' },
  ])
  if (article) {
    await campaignService.apply(campaign, {
      id: article.authorId,
      userName: 'test',
      state: USER_STATE.active,
    })
    await campaignService.submitArticleToCampaign(
      article,
      campaign.id,
      stages[0].id
    )
  }
  return [campaign, stages] as const
}
