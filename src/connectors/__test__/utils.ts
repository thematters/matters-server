import type { PaymentService, CampaignService } from 'connectors'
import type { Connections, MaterializedView, Article } from 'definitions'
import type { Knex } from 'knex'

import { knex } from 'knex'
import { knexSnakeCaseMappers } from 'objection'
// @ts-ignore
import initDatabase from '@root/db/initDatabase'
import Redis from 'ioredis-mock'
import { genRandomString } from 'common/utils'

import {
  CAMPAIGN_STATE,
  USER_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'

export const genConnections = async (): Promise<Connections> => {
  const database = 'test_matters_' + genRandomString()
  await initDatabase(database)

  const knexConfig = {
    client: 'postgresql',
    connection: {
      host: process.env.MATTERS_PG_HOST,
      user: process.env.MATTERS_PG_USER,
      password: process.env.MATTERS_PG_PASSWORD,
      database,
    },
    // set pool size to 1 to detect db connection acquiring deadlock
    // explained in https://github.com/Vincit/objection.js/issues/1137#issuecomment-561149456
    pool: { min: 1, max: 1 },
  }

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
    amount,
  }: {
    senderId: string
    recipientId: string
    purpose: TRANSACTION_PURPOSE
    currency: keyof typeof PAYMENT_CURRENCY
    state: TRANSACTION_STATE
    targetId?: string
    amount?: number
  },
  paymentService: PaymentService
) => {
  return paymentService.createTransaction({
    amount: amount ?? 0,
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
  })
  const stages = await campaignService.updateStages(campaign.id, [
    { name: 'stage1' },
  ])
  if (article) {
    const application = await campaignService.apply(campaign, {
      id: article.authorId,
      userName: 'test',
      state: USER_STATE.active,
    })
    await campaignService.approve(application.id)
    await campaignService.submitArticleToCampaign(
      article,
      campaign.id,
      stages[0].id
    )
  }
  return [campaign, stages] as const
}
