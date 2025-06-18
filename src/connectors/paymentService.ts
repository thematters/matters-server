import type {
  CirclePrice,
  Customer,
  BlockchainTransaction,
  Transaction,
  Connections,
  UserHasUsername,
  LANGUAGES,
  EmailableUser,
  GQLChain,
  BlockchainCurationEvent,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  NODE_TYPES,
  BLOCKCHAIN_TRANSACTION_STATE,
  NOTICE_TYPE,
  INVITATION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_TARGET_TYPE,
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_CHAINNAME,
  BLOCKCHAIN_SAFE_CONFIRMS,
  TRANSACTION_STATE,
  TRANSACTION_REMARK,
  SUBSCRIPTION_ITEM_REMARK,
} from '#common/enums/index.js'
import { contract, environment } from '#common/environment.js'
import { ServerError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import { getUTC8Midnight, numRound } from '#common/utils/index.js'
import {
  CurationContract,
  type CurationEvent,
  type CurationTxReceipt,
  type Log,
} from '#connectors/blockchain/curation.js'
import {
  CurationVaultContract,
  CurationVaultEvent,
} from '#connectors/blockchain/curationVault.js'
import {
  ArticleService,
  BaseService,
  NotificationService,
} from '#connectors/index.js'
import { stripe } from '#connectors/stripe/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import slugify from '@matters/slugify'
import * as Sentry from '@sentry/node'
import _capitalize from 'lodash/capitalize.js'
import { v4 } from 'uuid'
import { formatUnits, parseUnits } from 'viem'

const logger = getLogger('service-payment')

export type PaymentParams = {
  txId: string
}

export class PaymentService extends BaseService<Transaction> {
  public stripe: typeof stripe

  public constructor(connections: Connections) {
    super('transaction', connections)

    this.stripe = stripe
  }

  /*********************************
   *                               *
   *             Wallet            *
   *                               *
   *********************************/
  public calculateBalance = async ({
    userId,
    currency,
  }: {
    userId: string
    currency: keyof typeof PAYMENT_CURRENCY
  }) => {
    const result = await this.knex('transaction_delta_view')
      .where({
        userId,
        currency,
        state: TRANSACTION_STATE.succeeded,
      })
      .orWhere({
        userId,
        currency,
        purpose: TRANSACTION_PURPOSE.dispute,
        state: TRANSACTION_STATE.pending,
      })
      .sum('delta as total')
    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  private makeTransactionsQuery = ({
    id,
    providerTxId,
    userId,
    purpose,
    currency,
    states,
    excludeCanceledLIKE,
    notIn,
  }: {
    id?: string
    providerTxId?: string
    userId?: string
    purpose?: TRANSACTION_PURPOSE
    currency?: keyof typeof PAYMENT_CURRENCY
    states?: TRANSACTION_STATE[]
    excludeCanceledLIKE?: boolean
    notIn?: [string, string[]]
  }) => {
    const query = this.knex('transaction_delta_view').select()

    if (id) {
      query.where({ id })
    }

    if (providerTxId) {
      query.where({ providerTxId })
    }

    if (userId) {
      query.where({ userId })
    }

    if (purpose) {
      query.where({ purpose })
    }

    if (currency) {
      query.where({ currency })
    }

    if (states) {
      query.whereIn('state', states)
    }

    const containsLIKE = !currency || currency === PAYMENT_CURRENCY.LIKE
    if (containsLIKE && excludeCanceledLIKE) {
      query.whereNot((q) => {
        q.where({
          state: TRANSACTION_STATE.canceled,
          currency: PAYMENT_CURRENCY.LIKE,
        })
      })
    }

    if (notIn) {
      query.whereNotIn(...notIn)
    }

    return query
  }

  // count transactions by given conditions
  public totalTransactionCount = async (params: {
    id?: string
    providerTxId?: string
    userId: string
    purpose?: TRANSACTION_PURPOSE
    currency?: keyof typeof PAYMENT_CURRENCY
    states?: TRANSACTION_STATE[]
    excludeCanceledLIKE?: boolean
    notIn?: [string, string[]]
  }) => {
    const query = this.makeTransactionsQuery(params)
    const result = await query.count()

    return parseInt(`${result[0].count}` || '0', 10)
  }

  // find transactions by given conditions
  public findTransactions = ({
    skip,
    take,
    ...restParams
  }: {
    id?: string
    providerTxId?: string
    userId?: string
    purpose?: TRANSACTION_PURPOSE
    currency?: keyof typeof PAYMENT_CURRENCY
    states?: TRANSACTION_STATE[]
    excludeCanceledLIKE?: boolean
    notIn?: [string, string[]]
    skip?: number
    take?: number
  }) => {
    const query = this.makeTransactionsQuery(restParams)

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query.orderBy('created_at', 'desc')
  }

  public createTransaction = async (
    {
      amount,
      fee,

      state,
      purpose,
      currency = PAYMENT_CURRENCY.HKD,

      provider,
      providerTxId,

      recipientId,
      senderId,

      targetId,
      targetType = TRANSACTION_TARGET_TYPE.article,
      remark,
    }: {
      amount: number
      fee?: number

      state: TRANSACTION_STATE
      purpose: TRANSACTION_PURPOSE
      currency?: keyof typeof PAYMENT_CURRENCY

      provider: PAYMENT_PROVIDER
      providerTxId: string

      recipientId?: string
      senderId?: string

      targetId?: string
      targetType?: TRANSACTION_TARGET_TYPE
      remark?: string
    },
    trx?: Knex.Transaction
  ) => {
    let targetTypeId
    if (targetId && targetType) {
      const { id: entityTypeId } = await this.baseFindEntityTypeId(targetType)
      targetTypeId = entityTypeId
    }
    let articleVersionId
    if (targetId && targetType === TRANSACTION_TARGET_TYPE.article) {
      const articleService = new ArticleService(this.connections)
      articleVersionId = (
        await articleService.loadLatestArticleVersion(targetId)
      )?.id
    }

    return this.baseCreate(
      {
        amount: amount.toString(),
        fee: fee ? fee.toString() : undefined,

        state,
        currency,
        purpose,

        provider,
        providerTxId,

        senderId,
        recipientId,
        targetId,
        articleVersionId,
        targetType: targetTypeId,
        remark,
      },
      undefined,
      undefined,
      undefined,
      trx
    )
  }

  public findOrCreateBlockchainTransaction = async (
    { chainId, txHash }: { chainId: string | number; txHash: string },
    data?: {
      state?: BLOCKCHAIN_TRANSACTION_STATE
      from?: string
      to?: string
      blockNumber?: number
    },
    trx?: Knex.Transaction
  ) => {
    const table = 'blockchain_transaction'
    const txHashDb = txHash.toLowerCase()

    const where = { txHash: txHashDb, chainId }

    const toInsert = {
      ...where,
      ...(data || {}),
    }

    return this.baseFindOrCreate<BlockchainTransaction>({
      where,
      data: toInsert as unknown as BlockchainTransaction,
      table,
      trx,
    })
  }

  public findOrCreateTransactionByBlockchainTxHash = async ({
    chainId,
    txHash,
    txId,

    amount,
    fee,

    state,
    purpose,
    currency,

    recipientId,
    senderId,

    targetId,
    targetType = TRANSACTION_TARGET_TYPE.article,
    remark,
  }: {
    chainId: string
    txHash: string
    txId?: string

    amount: number
    fee?: number

    state: TRANSACTION_STATE
    purpose: TRANSACTION_PURPOSE
    currency?: keyof typeof PAYMENT_CURRENCY

    recipientId?: string
    senderId?: string

    targetId?: string
    targetType?: TRANSACTION_TARGET_TYPE
    remark?: string
  }) => {
    const trx = await this.knex.transaction()

    try {
      const blockchainTx = await this.findOrCreateBlockchainTransaction(
        { chainId, txHash },
        undefined,
        trx
      )

      const provider = PAYMENT_PROVIDER.blockchain
      const providerTxId = blockchainTx.id

      let tx

      // correct an existing transaction with the blockchainTx
      if (txId) {
        ;[tx] = await trx
          .where({ id: txId })
          .update({ providerTxId })
          .into(this.table)
          .returning('*')
          .transacting(trx)
      } else {
        tx = await trx
          .select()
          .from(this.table)
          .where({ providerTxId, provider })
          .first()
      }

      // or create a new transaction with the blockchainTx
      if (!tx) {
        tx = await this.createTransaction(
          {
            amount,
            fee,
            state,
            purpose,
            currency,
            provider,
            providerTxId,
            recipientId,
            senderId,
            targetId,
            targetType,
            remark,
          },
          trx
        )
      }

      await trx('blockchain_transaction')
        .where({ id: blockchainTx.id })
        .update({ transactionId: tx.id })
        .transacting(trx)

      await trx.commit()
      return tx
    } catch (error) {
      await trx.rollback()
      Sentry.captureException(error)
      throw error
    }
  }

  // Update blockchain_transaction's state by given id
  public markBlockchainTransactionStateAs = async ({
    id,
    state,
  }: {
    id: string
    state: BLOCKCHAIN_TRANSACTION_STATE
  }) =>
    this.models.update({
      table: 'blockchain_transaction',
      where: { id },
      data: { state },
    })

  // Update transaction's state by given id
  public markTransactionStateAs = async (
    {
      id,
      state,
      remark,
    }: {
      id: string
      state: TRANSACTION_STATE
      remark?: string | null
    },
    trx?: Knex.Transaction
  ) => {
    const data = remark
      ? {
          state,
          remark,
        }
      : {
          state,
        }

    return this.baseUpdate(id, data, 'transaction', trx)
  }

  /**
   * Sum up the amount of donation transaction.
   *
   */
  public sumTodayDonationTransactions = async ({
    currency = PAYMENT_CURRENCY.HKD,
    senderId,
  }: {
    currency?: keyof typeof PAYMENT_CURRENCY
    senderId: string
  }) => {
    const todayMidnight = getUTC8Midnight()
    const result = await this.knex('transaction')
      .where({
        purpose: TRANSACTION_PURPOSE.donation,
        senderId,
        state: TRANSACTION_STATE.succeeded,
      })
      .andWhere('created_at', '>=', todayMidnight.toISOString())
      .groupBy('sender_id')
      .sum('amount as amount')
      .first()

    if (!result) {
      return 0
    }
    return Math.max(parseInt(result.amount || 0, 10), 0)
  }

  /*********************************
   *                               *
   *            Customer           *
   *                               *
   *********************************/
  public createCustomer = async ({
    user,
    provider,
  }: {
    user: { id: string; email: string }
    provider: PAYMENT_PROVIDER
  }) => {
    if (provider === PAYMENT_PROVIDER.stripe) {
      const customer = await this.stripe.createCustomer({
        user,
      })

      if (!customer || !customer.id) {
        throw new ServerError('failed to create customer')
      }

      return this.baseCreate<Customer>(
        {
          userId: user.id,
          provider,
          customerId: customer.id,
        },
        'customer'
      )
    }
  }

  public deleteCustomer = async ({
    userId,
    customerId,
  }: {
    userId?: string
    customerId?: string
  }) => {
    if (!userId && !customerId) {
      throw new ServerError('userId/customerId is required')
    }

    const query = this.knex('customer')

    if (userId) {
      query.where({ userId })
    }

    if (customerId) {
      query.where({ customerId })
    }

    return query.del()
  }

  /*********************************
   *                               *
   *            Payment            *
   *                               *
   *********************************/
  public createPayment = async ({
    userId,
    customerId,
    amount,
    purpose,
    currency,
    provider,
  }: {
    userId: string
    customerId: string
    amount: number
    purpose: TRANSACTION_PURPOSE
    currency: keyof typeof PAYMENT_CURRENCY
    provider: PAYMENT_PROVIDER
  }) => {
    if (provider === PAYMENT_PROVIDER.stripe) {
      // create a payment intent from Stripe
      // const fee = calcStripeFee(amount)
      // const total = numRound(amount + fee)
      const total = numRound(amount)
      const payment = await this.stripe.createPaymentIntent({
        customerId,
        amount: total,
        currency,
      })

      if (!payment) {
        throw new ServerError('failed to create payment')
      }

      // create a pending transaction from DB
      const transaction = await this.createTransaction({
        amount,
        // fee,
        state: TRANSACTION_STATE.pending,
        currency,
        purpose,
        provider,
        providerTxId: payment.id,
        recipientId: userId,
      })

      return {
        client_secret: payment.client_secret,
        transaction,
      }
    }
  }

  /*********************************
   *                               *
   *             Payout            *
   *                               *
   *********************************/
  public calculateHKDBalance = async ({ userId }: { userId: string }) => {
    const result = await this.knex
      .select()
      .from(
        this.knex.raw(`(
          select
            sum(amount) as amount
          from
            transaction
          where
            recipient_id = ${userId} and currency = 'HKD' and state = 'succeeded'
          union
          select
            sum((0 - amount)) as amount
          from
            transaction
          where
            sender_id = ${userId} and currency = 'HKD' and (state = 'succeeded' or state = 'pending')
        ) as src`)
      )
      .sum('src.amount', { as: 'amount' })
      .first()

    return parseInt(result?.amount || 0, 10)
  }

  public countPendingPayouts = async ({ userId }: { userId: string }) => {
    const result = await this.knex('transaction')
      .where({
        purpose: TRANSACTION_PURPOSE.payout,
        senderId: userId,
        state: TRANSACTION_STATE.pending,
      })
      .count()

    if (!result || !result[0]) {
      return 0
    }
    return parseInt(`${result[0].count}` || '0', 10)
  }

  /*********************************
   *                               *
   *             Invoice           *
   *                               *
   *********************************/
  public findInvoice = async ({
    id,
    userId,
    providerInvoiceId,
    skip,
    take,
  }: {
    id?: number
    userId?: number
    providerInvoiceId?: string
    skip?: number
    take?: number
  }) => {
    const query = this.knex('circle_invoice').select()

    if (userId) {
      query.where({ userId })
    }
    if (id) {
      query.where({ id })
    }
    if (providerInvoiceId) {
      query.where({ providerInvoiceId })
    }
    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query.orderBy('created_at', 'desc')
  }

  public createInvoiceWithTransactions = async ({
    amount,
    currency,
    providerTxId,
    providerInvoiceId,
    subscriptionId,
    userId,
    prices,
  }: {
    amount: number
    currency: string
    providerTxId: string
    providerInvoiceId: string
    subscriptionId: string
    userId: string
    prices: CirclePrice[]
  }) => {
    const trx = await this.knex.transaction()
    try {
      // create subscription top up transaction
      const [trans] = await trx('transaction')
        .insert({
          amount,
          currency,
          state: TRANSACTION_STATE.succeeded,
          purpose: TRANSACTION_PURPOSE.subscription,

          provider: PAYMENT_PROVIDER.stripe,
          providerTxId,
          senderId: undefined,
          recipientId: userId,

          targetType: undefined,
          targetId: undefined,
        })
        .returning('*')

      // create circle invoice
      await trx('circle_invoice').insert({
        userId,
        transactionId: trans.id,
        subscriptionId,
        provider: PAYMENT_PROVIDER.stripe,
        providerInvoiceId,
      })

      // verify if it is OK to split the payment given the circle prices
      for (const p of prices) {
        if (p.currency !== currency) {
          throw new ServerError(
            `currency for '${providerTxId}' is not the same to '${p.providerPriceId}'`
          )
        }
      }

      const totalAmount = prices
        .map((p) => Number(p.amount))
        .reduce((p1, p2) => p1 + p2)
      if (totalAmount !== amount) {
        throw new ServerError(
          `sum of plan prices '${totalAmount}' != invoice paid amount '${amount}'`
        )
      }

      // create transactions to split the invoice payment to circles
      const { id: entityTypeId } = await this.baseFindEntityTypeId(
        TRANSACTION_TARGET_TYPE.circlePrice
      )
      for (const p of prices) {
        const circle = await this.baseFindById<{ owner: string }>(
          p.circleId,
          'circle'
        )
        await trx('transaction').insert({
          amount: p.amount,
          currency: p.currency,
          state: TRANSACTION_STATE.succeeded,
          purpose: TRANSACTION_PURPOSE.subscriptionSplit,

          provider: PAYMENT_PROVIDER.matters,
          providerTxId: v4(),

          senderId: userId,
          recipientId: circle?.owner,

          targetType: entityTypeId,
          targetId: p.id,
          remark: `stripe:${providerTxId}`,
          parentId: trans.id,
        })
      }
      await trx.commit()

      logger.info(
        `invoice '${providerInvoiceId}' has been successfully paid and splitted.`
      )
    } catch (e) {
      await trx.rollback()
      Sentry.captureException(e)
      throw e
    }
  }

  public isTransactionSplitted = async ({
    parentId,
    amount,
  }: {
    parentId: number
    amount: number
  }) => {
    const splitTxs = await this.knex('transaction').select().where({
      purpose: TRANSACTION_PURPOSE.subscriptionSplit,
      state: TRANSACTION_STATE.succeeded,
      parentId,
    })

    const splitTotal = splitTxs.reduce((accumulator, tx) => {
      const amt = Number(tx.amount)
      return accumulator + amt
    }, 0)
    return Math.floor(amount) === splitTotal
  }

  public cancelTimeoutTransactions = async () =>
    await this.knex('transaction')
      .update({
        state: TRANSACTION_STATE.canceled,
        remark: TRANSACTION_REMARK.TIME_OUT,
      })
      .where(
        'created_at',
        '<',
        this.knex.raw(`now() - ('30 minutes'::interval)`)
      )
      .andWhere({ state: TRANSACTION_STATE.pending })
      .whereNotIn('purpose', [
        TRANSACTION_PURPOSE.payout,
        TRANSACTION_PURPOSE.dispute,
      ])

  /*********************************
   *                               *
   *         Subscription          *
   *                               *
   *********************************/
  public transferTrialEndSubscriptions = async () => {
    // obtain trial end subscription items from the past 30 days
    const trialEndSubItems = await this.knex
      .select(
        'csi.id',
        'csi.subscription_id',
        'csi.user_id',
        'csi.price_id',
        'circle_price.provider_price_id',
        'circle_price.circle_id',
        'expired_ivts.id as invitation_id'
      )
      .from(
        this.knex('circle_invitation')
          .select(
            '*',
            this.knex.raw(
              `accepted_at + ${
                environment.subscriptionTrialExpire
                  ? environment.subscriptionTrialExpire
                  : "duration_in_days * '1 day'"
              }::interval AS ended_at`
            )
          )
          .where({ state: INVITATION_STATE.accepted })
          .whereNotNull('subscription_item_id')
          .as('expired_ivts')
      )
      .leftJoin(
        'circle_subscription_item as csi',
        'csi.id',
        'expired_ivts.subscription_item_id'
      )
      .leftJoin('circle_price', 'circle_price.id', 'csi.price_id')
      .where({
        'csi.provider': PAYMENT_PROVIDER.matters,
        'csi.archived': false,
        'circle_price.state': PRICE_STATE.active,
      })
      .andWhere('ended_at', '>', this.knex.raw(`now() - interval '1 months'`))
      .andWhere('ended_at', '<=', this.knex.raw(`now()`))

    const succeedItemIds = []
    const failedItemIds = []
    for (const item of trialEndSubItems) {
      try {
        // archive Matters subscription item
        await this.archiveMattersSubItem({
          subscriptionId: item.subscriptionId,
          subscriptionItemId: item.id,
        })

        // create Stripe subscription item
        await this.createStripeSubItem({
          userId: item.userId,
          priceId: item.priceId,
          providerPriceId: item.providerPriceId,
        })

        // mark invitation as `transfer_succeeded`
        await this.markInvitationAs({
          invitationId: item.invitationId,
          state: INVITATION_STATE.transfer_succeeded,
        })

        succeedItemIds.push(item.id)
        console.info(`Matters subscription item ${item.id} moved to Stripe.`)
      } catch (error) {
        // mark invitation as `transfer_failed`
        await this.markInvitationAs({
          invitationId: item.invitationId,
          state: INVITATION_STATE.transfer_failed,
        })

        failedItemIds.push(item.id)
        console.error(error)
      }

      // invalidate user & circle
      invalidateFQC({
        node: { type: NODE_TYPES.User, id: item.userId },
        redis: this.connections.redis,
      })
      invalidateFQC({
        node: { type: NODE_TYPES.Circle, id: item.circleId },
        redis: this.connections.redis,
      })
    }
  }

  private archiveMattersSubItem = async ({
    subscriptionId,
    subscriptionItemId,
  }: {
    subscriptionId: string
    subscriptionItemId: string
  }) => {
    const subItems = await this.knex('circle_subscription_item')
      .select()
      .where({ subscriptionId, archived: false })

    // cancel the subscription if only one subscription item left
    if (subItems.length <= 1) {
      await this.knex('circle_subscription')
        .where({ id: subscriptionId })
        .update({
          state: SUBSCRIPTION_STATE.canceled,
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
    }

    await this.knex('circle_subscription_item')
      .where({ id: subscriptionItemId })
      .update({
        archived: true,
        updatedAt: new Date(),
        canceledAt: new Date(),
        remark: SUBSCRIPTION_ITEM_REMARK.trial_end,
      })
  }

  private createStripeSubItem = async ({
    userId,
    priceId,
    providerPriceId,
  }: {
    userId: string
    priceId: string
    providerPriceId: string
  }) => {
    // retrieve user customer and subscriptions
    const customer = await this.knex('customer')
      .select()
      .where({
        userId,
        provider: PAYMENT_PROVIDER.stripe,
        archived: false,
      })
      .first()
    const subscriptions = await this.findActiveSubscriptions({
      userId,
    })

    if (!customer || !customer.cardLast4) {
      throw new Error('Credit card is required on customer')
    }

    await this.createSubscriptionOrItem({
      userId,
      priceId,
      providerPriceId,
      providerCustomerId: customer.customerId,
      subscriptions,
    })
  }

  private markInvitationAs = async ({
    invitationId,
    state,
  }: {
    invitationId: string
    state: INVITATION_STATE
  }) =>
    this.knex('circle_invitation').where({ id: invitationId }).update({ state })

  /**
   * Check if user is circle member
   */
  public isCircleMember = async ({
    circleId,
    userId,
  }: {
    circleId: string
    userId: string
  }) => {
    const records = await this.knex
      .select()
      .from('circle_subscription_item as csi')
      .join('circle_price', 'circle_price.id', 'csi.price_id')
      .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
      .where({
        'csi.user_id': userId,
        'csi.archived': false,
        'circle_price.circle_id': circleId,
        'circle_price.state': PRICE_STATE.active,
      })
      .whereIn('cs.state', [
        SUBSCRIPTION_STATE.active,
        SUBSCRIPTION_STATE.trialing,
      ])
    const isCircleMember = records && records.length > 0

    return isCircleMember
  }

  public findActiveSubscriptions = async ({
    userId,
    provider,
  }: {
    userId: string
    provider?: PAYMENT_PROVIDER
  }) => {
    const subscriptions = await this.knex
      .select()
      .from('circle_subscription')
      .where({ userId, ...(provider ? { provider } : {}) })
      .whereIn('state', [
        SUBSCRIPTION_STATE.active,
        SUBSCRIPTION_STATE.trialing,
        SUBSCRIPTION_STATE.pastDue,
      ])

    return subscriptions || []
  }

  public createSubscriptionOrItem = async (data: {
    userId: string
    priceId: string
    providerPriceId: string
    providerCustomerId: string
    subscriptions: any[]
  }) => {
    const { userId, priceId, subscriptions } = data

    const invitation = await this.findPendingInvitation({ userId, priceId })
    const targetMattersSub = !!invitation
    const targetStripeSub = !invitation
    const hasMattersSub = subscriptions.some(
      (sub) => sub.provider === PAYMENT_PROVIDER.matters
    )
    const hasStripeSub = subscriptions.some(
      (sub) => sub.provider === PAYMENT_PROVIDER.stripe
    )

    await ((targetMattersSub && !hasMattersSub) ||
    (targetStripeSub && !hasStripeSub)
      ? this.createSubscription({ ...data, invitation })
      : this.createSubscriptionItem({ ...data, invitation }))
  }

  /**
   * Create a subscription by a given circle price,
   * subscription item will be created correspondingly.
   */
  public createSubscription = async ({
    userId,
    priceId,
    providerPriceId,
    providerCustomerId,
    invitation,
  }: {
    userId: string
    priceId: string
    providerPriceId: string
    providerCustomerId: string
    invitation: any
  }) => {
    /**
     * Create Matters subscription if it's with trial invitation
     */
    const targetMattersSub = !!invitation

    if (targetMattersSub) {
      // Create to DB
      const [mattersDBSub] = await this.knex('circle_subscription')
        .insert({
          provider: PAYMENT_PROVIDER.matters,
          providerSubscriptionId: v4(),
          state: SUBSCRIPTION_STATE.trialing,
          userId,
        })
        .returning('*')
      const [mattersDBSubItem] = await this.knex('circle_subscription_item')
        .insert({
          subscriptionId: mattersDBSub.id,
          userId,
          priceId,
          provider: PAYMENT_PROVIDER.matters,
          providerSubscriptionItemId: v4(),
        })
        .returning('*')

      // Mark invitation as accepted
      await this.acceptInvitation(invitation.id, mattersDBSubItem.id)
      return
    }

    /**
     * Create Stripe subscription
     */
    // Create from Stripe
    const stripeSub = await this.stripe.createSubscription({
      customer: providerCustomerId,
      price: providerPriceId,
    })

    if (!stripeSub) {
      throw new ServerError('failed to create stripe subscription')
    }

    // Save to DB
    const [stripeDBSub] = await this.knex('circle_subscription')
      .insert({
        state: stripeSub.status,
        userId,
        provider: PAYMENT_PROVIDER.stripe,
        providerSubscriptionId: stripeSub.id,
      })
      .returning('*')
    await this.knex('circle_subscription_item')
      .insert({
        subscriptionId: stripeDBSub.id,
        userId,
        priceId,
        provider: PAYMENT_PROVIDER.stripe,
        providerSubscriptionItemId: stripeSub.items.data[0].id,
      })
      .returning('*')
  }

  /**
   * Create a subscription item by a given circle price,
   * and added to subscription.
   */
  public createSubscriptionItem = async ({
    userId,
    priceId,
    providerPriceId,
    subscriptions,
    invitation,
  }: {
    userId: string
    priceId: string
    providerPriceId: string
    subscriptions: any[]
    invitation: any
  }) => {
    /**
     * Create Matters subscription item if it's with trial invitation
     */
    const targetMattersSub = !!invitation

    if (targetMattersSub) {
      const mattersDBSubs = subscriptions.filter(
        (sub) => sub.provider === PAYMENT_PROVIDER.matters
      )
      const mattersDBSub = mattersDBSubs && mattersDBSubs[0]

      // Create to DB
      const [mattersDBSubItem] = await this.knex('circle_subscription_item')
        .insert({
          subscriptionId: mattersDBSub.id,
          userId,
          priceId,
          provider: PAYMENT_PROVIDER.matters,
          providerSubscriptionItemId: v4(),
        })
        .returning('*')

      // Mark invitation as accepted
      await this.acceptInvitation(invitation.id, mattersDBSubItem.id)
      return
    }

    /**
     * Create Stripe subscription item
     */
    const stripeDBSubs = subscriptions.filter(
      (sub) => sub.provider === PAYMENT_PROVIDER.stripe
    )
    const stripeDBSub = stripeDBSubs && stripeDBSubs[0]

    // Create from Stripe
    const stripeSubItem = await this.stripe.createSubscriptionItem({
      price: providerPriceId,
      subscription: stripeDBSub.providerSubscriptionId,
    })

    if (!stripeSubItem) {
      throw new ServerError('failed to create stripe subscription item')
    }

    // Save to DB
    await this.knex('circle_subscription_item')
      .insert({
        subscriptionId: stripeDBSub.id,
        userId,
        priceId,
        provider: PAYMENT_PROVIDER.stripe,
        providerSubscriptionItemId: stripeSubItem.id,
      })
      .returning('*')
  }

  /*********************************
   *                               *
   *           Invitation          *
   *                               *
   *********************************/
  /**
   * Find invitation applicable to a user for a cirlce
   */
  public findPendingInvitation = async (params: {
    userId: string
    priceId: string
  }) => {
    const user = await this.knex
      .select()
      .from('user')
      .where({ id: params.userId })
      .first()
    const records = await this.knex
      .select('ci.id')
      .from('circle_invitation as ci')
      .join('circle_price as cp', 'cp.circle_id', 'ci.circle_id')
      .where({
        'cp.id': params.priceId,
        'ci.state': INVITATION_STATE.pending,
      })
      .andWhere(function () {
        this.where('ci.user_id', params.userId).orWhere('ci.email', user.email)
      })
      .orderBy('ci.created_at', 'desc')

    return records.length > 0 ? records[0] : undefined
  }

  /**
   * Accept invitation
   */
  public acceptInvitation = async (
    ivtId: string,
    subscriptionItemId: string
  ) => {
    await this.knex('circle_invitation')
      .where('id', ivtId)
      .update({
        state: INVITATION_STATE.accepted,
        accepted_at: this.knex.fn.now(),
        subscriptionItemId,
      })
      .returning('*')
  }

  /*********************************
   *                               *
   *           Donation            *
   *                               *
   *********************************/

  public isDonator = async (userId: string, articleId: string) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )
    const count = await this.models.count({
      table: 'transaction',
      where: {
        purpose: TRANSACTION_PURPOSE.donation,
        targetType: entityTypeId,
        targetId: articleId,
        senderId: userId,
      },
      whereIn: [
        'state',
        [TRANSACTION_STATE.succeeded, TRANSACTION_STATE.pending],
      ],
    })
    return count > 0
  }

  public notifyDonation = async ({
    tx,
    sender,
    recipient,
    article,
  }: {
    tx: Transaction
    sender?: {
      id: string
      displayName: string
      userName: string
      email: string | null
      language: LANGUAGES
    }
    recipient: {
      id: string
      displayName: string
      userName: string
      email: string | null
      language: LANGUAGES
    }
    article: {
      id: string
      authorId: string
      shortHash: string
    }
  }) => {
    const notificationService = new NotificationService(this.connections)
    const articleService = new ArticleService(this.connections)
    const amount = parseFloat(tx.amount)
    const author = (await this.models.findUnique({
      table: 'user',
      where: { id: article.authorId },
    })) as UserHasUsername
    const articleVersion = await articleService.loadLatestArticleVersion(
      article.id
    )

    const hasReplyToDonator = !!articleVersion.replyToDonator
    const _article = {
      id: tx.targetId,
      title: articleVersion.title,
      slug: slugify(articleVersion.title),
      mediaHash: articleVersion.mediaHash,
      shortHash: article.shortHash,
      author: {
        displayName: author.displayName,
        userName: author.userName,
      },
      hasReplyToDonator,
    }

    // send email to sender
    if (sender?.email) {
      const donationCount = await this.donationCount(sender.id)
      await notificationService.mail.sendPayment({
        to: sender.email,
        recipient: {
          displayName: sender.displayName,
          userName: sender.userName,
        },
        type: 'donated',
        article: _article,
        tx: {
          recipient,
          sender,
          amount,
          currency: tx.currency,
          donationCount,
        },
        language: sender.language,
      })
    }

    // notify recipient
    await notificationService.trigger({
      event: NOTICE_TYPE.payment_received_donation,
      actorId: sender?.id || null,
      recipientId: recipient.id,
      entities: [{ type: 'target', entityTable: 'transaction', entity: tx }],
    })

    const mailType =
      tx.currency === PAYMENT_CURRENCY.LIKE
        ? ('receivedDonationLikeCoin' as const)
        : ('receivedDonation' as const)

    if (recipient.email) {
      await notificationService.mail.sendPayment({
        to: recipient.email,
        recipient: {
          displayName: recipient.displayName,
          userName: recipient.userName,
        },
        type: mailType,
        tx: {
          recipient,
          sender,
          amount,
          currency: tx.currency,
        },
        article: _article,
        language: recipient.language,
      })
    }
  }

  private donationCount = async (senderId: string) => {
    const result = await this.knex('transaction')
      .where({
        senderId,
        purpose: TRANSACTION_PURPOSE.donation,
        state: TRANSACTION_STATE.succeeded,
      })
      .count()

    if (!result || !result[0]) {
      return 0
    }
    return parseInt(`${result[0].count}` || '0', 10)
  }

  public addDonationCountColumn = async (articlesQuery: Knex.QueryBuilder) => {
    const column = 'donation_count'
    const { id: targetTypeId } = await this.baseFindEntityTypeId('article')
    const knex = articlesQuery.client.queryBuilder()
    return {
      query: knex
        .clone()
        .from(articlesQuery.as('t1'))
        .leftJoin(
          knex
            .clone()
            .from('transaction')
            .where({
              purpose: TRANSACTION_PURPOSE.donation,
              state: TRANSACTION_STATE.succeeded,
              targetType: targetTypeId,
            })
            .groupBy('target_id')
            .select(
              'target_id',
              knex.client.raw('COUNT(DISTINCT sender_id) as ??', [column])
            )
            .as('t2'),
          't1.id',
          't2.target_id'
        )
        .select(
          't1.*',
          knex.client.raw('COALESCE(t2.??, 0) as ??', [column, column])
        ),
      column,
    }
  }

  /****************************************************
   *                                                  *
   *           Blockchain Payment Logic              *
   *                                                  *
   ****************************************************/

  /**
   * Process a payment transaction
   *
   * 1. Mark tx as succeeded if tx is mined;
   * 2. Mark tx as failed if blockchain tx or tx is reverted;
   * 3. Skip to process if tx is not found or mined;
   */
  public payToBlockchain = async (
    params: PaymentParams,
    fetchTxReceipt?: (
      txHash: `0x${string}`
    ) => Promise<CurationTxReceipt | null>
  ) => {
    const { txId } = params

    // skip if tx is not found
    const tx = await this.models.findUnique({
      table: 'transaction',
      where: { id: txId },
    })
    if (!tx) {
      throw new Error('pay-to pending tx not found')
    }
    if (tx.provider !== PAYMENT_PROVIDER.blockchain) {
      throw new Error('wrong pay-to queue')
    }

    // skip if blockchain tx is not found
    const blockchainTx = await this.knex<BlockchainTransaction>(
      'blockchain_transaction'
    )
      .where({ id: tx.providerTxId })
      .first()

    if (!blockchainTx) {
      throw new Error('blockchain transaction not found')
    }

    const chain = BLOCKCHAIN_CHAINNAME[blockchainTx.chainId]
    const curation = new CurationContract(BLOCKCHAIN_CHAINID[chain])
    const curationVault = new CurationVaultContract()

    // vault contract only for recipient w/o ETH address
    const recipient = await this.models.findUnique({
      table: 'user',
      where: { id: tx.recipientId },
    })

    const isVaultCuration = !recipient.ethAddress
    const txReceipt = fetchTxReceipt
      ? await fetchTxReceipt(blockchainTx.txHash)
      : await (isVaultCuration ? curationVault : curation).fetchTxReceipt(
          blockchainTx.txHash
        )

    // update metadata blockchain tx
    if (txReceipt) {
      await this.models.update({
        table: 'blockchain_transaction',
        where: { id: blockchainTx.id },
        data: {
          from: txReceipt.from, // curator address
          to: txReceipt.to, // contract address
          blockNumber: txReceipt.blockNumber.toString(),
        },
      })
    } else {
      // skip if tx is not mined
      throw new Error('blockchain transaction not mined')
    }

    // fail both tx and blockchain tx if it's reverted
    if (txReceipt.reverted) {
      await this.updateTxAndBlockchainTxState({
        txId,
        txState: TRANSACTION_STATE.failed,
        blockchainTxId: blockchainTx.id,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.reverted,
      })
      return params
    }

    const [sender, article] = await Promise.all([
      tx.senderId
        ? this.models.findUnique({
            table: 'user',
            where: { id: tx.senderId },
          })
        : null,
      this.models.findUnique({
        table: 'article',
        where: { id: tx.targetId },
      }),
    ])

    if (!article) {
      throw new Error(`Article not found: ${tx.targetId}`)
    }

    const articleVersions = await this.models.findMany({
      table: 'article_version',
      where: {
        articleId: article.id,
      },
    })
    const articleCids = articleVersions.map((v) => v.dataHash)

    // cancel tx and success blockchain tx if it's invalid
    // Note: sender and recipient's ETH address may change after tx is created
    const isValidTx = await this.containMatchedEvent(txReceipt.events, {
      cids: articleCids.filter((cid) => cid !== null),
      shortHash: article.shortHash,
      amount: tx.amount,
      // support USDT only for now
      tokenAddress: contract[chain].tokenAddress,
      decimals: contract[chain].tokenDecimals,
    })
    if (!isValidTx) {
      await this.updateTxAndBlockchainTxState({
        txId,
        txState: TRANSACTION_STATE.canceled,
        txRemark: TRANSACTION_REMARK.INVALID,
        blockchainTxId: blockchainTx.id,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
      })
      return params
    }

    // anonymize tx if sender's ETH address is not matched
    const isSenderMatched = txReceipt.events
      .map((e: any) => e.curatorAddress)
      .every((address: string) =>
        ignoreCaseMatch(address, sender?.ethAddress || '')
      )
    if (!isSenderMatched) {
      await this.models.update({
        table: 'transaction',
        where: { id: tx.id },
        data: { senderId: null },
      })
    }

    // success both tx and blockchain tx if it's valid
    await this.succeedBothTxAndBlockchainTx(txId, blockchainTx.id)

    // notify recipient and sender (if needed)
    await this.notifyDonation({
      tx,
      sender: isSenderMatched ? (sender as EmailableUser) : undefined,
      recipient: recipient as EmailableUser,
      article,
    })

    await this.invalidCache(tx.targetType, tx.targetId)
    return params
  }

  /**
   * Sync curation events from blockchain
   */
  public handleSyncCurationEvents = async (chain: GQLChain) => {
    const results: number[] = []

    try {
      const curation = new CurationContract(BLOCKCHAIN_CHAINID[chain])
      results.push(await this._handleSyncCurationEvents(chain, curation))
    } catch (error) {
      console.error('Failed to sync curation events', error)
      throw error
    }

    try {
      const curationVault = new CurationVaultContract()
      results.push(await this._handleSyncCurationEvents(chain, curationVault))
    } catch (error) {
      console.error('Failed to sync curation vault events', error)
      throw error
    }

    return results
  }

  private _handleSyncCurationEvents = async (
    chain: GQLChain,
    curation: CurationContract | CurationVaultContract
  ) => {
    const chainId = BLOCKCHAIN_CHAINID[chain]

    // fetch events
    const record = await this.models.findFirst({
      table: 'blockchain_sync_record',
      where: { chainId, contractAddress: curation.address },
    })
    const oldSavepoint = record
      ? BigInt(parseInt(record.blockNumber, 10))
      : BigInt(parseInt(curation.blockNum, 10) || 0)
    const [logs, newSavepoint] = await this.fetchCurationLogs(
      curation,
      oldSavepoint
    )

    // update tx state and save events
    await this._syncCurationEvents(logs, chain)

    // save progress
    const updated = await this.models.update({
      table: 'blockchain_sync_record',
      where: { chainId, contractAddress: curation.address },
      data: {
        blockNumber: newSavepoint.toString(),
        updatedAt: new Date(),
      },
    })
    if (!updated) {
      await this.models.create({
        table: 'blockchain_sync_record',
        data: {
          chainId,
          contractAddress: curation.address,
          blockNumber: newSavepoint.toString(),
          updatedAt: new Date(),
        },
      })
    }

    return Number(newSavepoint)
  }

  // Helper functions
  private handleNewEvent = async (
    event: CurationEvent | CurationVaultEvent,
    chain: GQLChain,
    blockchainTx: {
      id: string
      transactionId: string | null
      state: string
    }
  ) => {
    // skip if blockchain tx is already resolved
    if (
      blockchainTx.transactionId &&
      blockchainTx.state === BLOCKCHAIN_TRANSACTION_STATE.succeeded
    ) {
      return
    }

    // skip if token address or uri is invalid
    // support USDT only for now
    if (
      !ignoreCaseMatch(
        event.tokenAddress || '',
        contract[chain].tokenAddress
      ) ||
      !isValidUri(event.uri)
    ) {
      return
    }

    // skip if recipient or article is not found
    const creatorUser =
      'creatorAddress' in event // from curation contract
        ? await this.findByEthAddress(event.creatorAddress)
        : 'creatorId' in event && event.creatorId // from curation vault contract
        ? await this.models.findFirst({
            table: 'user',
            where: { id: event.creatorId },
          })
        : undefined
    if (!creatorUser) {
      return
    }
    const { cid, shortHash } = extractCidOrShortHash(event.uri)
    const articleVersion = cid
      ? await this.models.findFirst({
          table: 'article_version',
          where: { dataHash: cid },
        })
      : undefined
    const article = articleVersion
      ? await this.models.findFirst({
          table: 'article',
          where: {
            id: articleVersion?.articleId,
            authorId: creatorUser.id,
          },
        })
      : shortHash
      ? await this.models.findFirst({
          table: 'article',
          where: { shortHash },
        })
      : undefined

    if (!article) {
      return
    }

    const amount = parseFloat(
      formatUnits(BigInt(event.amount), contract[chain].tokenDecimals)
    )
    let tx

    // can find via `blockchainTx.transactionId`
    // for tx that is created by `payTo` mutation previously
    // but haven't resolved by `handlePayTo`
    if (blockchainTx.transactionId) {
      tx = await this.models.findFirst({
        table: 'transaction',
        where: { id: blockchainTx.transactionId },
      })
    }

    // can find via `blockchainTx.id`
    // for tx that is created by `payTo` mutation previously
    // but linked to the wrong blockchainTx
    if (!tx) {
      tx = await this.models.findFirst({
        table: 'transaction',
        where: {
          provider: PAYMENT_PROVIDER.blockchain,
          providerTxId: blockchainTx.id,
        },
      })

      // correct `blockchainTx.transactionId`
      if (tx) {
        await this.models.update({
          table: 'blockchain_transaction',
          where: { id: blockchainTx.id },
          data: { transactionId: String(tx.id) },
        })

        // skip if tx is already resolved
        if (tx.state === TRANSACTION_STATE.succeeded) {
          return
        }
      }
    }

    // can find via matching the tx data (amount, sender, recipient, etc.)
    // for sender who fails to request the settlement `payTo` mutation
    if (!tx) {
      const senderUser = await this.findByEthAddress(event.curatorAddress)
      tx = await this.models.findFirst({
        table: 'transaction',
        where: {
          amount: amount.toString(),
          state: TRANSACTION_STATE.pending,
          purpose: TRANSACTION_PURPOSE.donation,
          currency: PAYMENT_CURRENCY.USDT,
          provider: PAYMENT_PROVIDER.blockchain,
          recipientId: creatorUser.id,
          senderId: senderUser?.id,
          targetId: article.id,
        },
      })

      // correct `blockchainTx.transactionId` and `tx.providerId`
      if (tx) {
        await Promise.all([
          this.models.update({
            table: 'blockchain_transaction',
            where: { id: blockchainTx.id },
            data: { transactionId: String(tx.id) },
          }),
          this.models.update({
            table: 'transaction',
            where: { id: tx.id },
            data: { providerTxId: blockchainTx.id },
          }),
        ])
      }
    }

    if (tx) {
      // correct invalid tx
      // e.g. sender changes the amount on MetaMask
      const isValidTx =
        tx.targetId === article.id &&
        parseUnits(tx.amount, contract[chain].tokenDecimals).toString() ===
          event.amount

      if (!isValidTx) {
        await this.models.update({
          table: 'transaction',
          where: { id: tx.id },
          data: {
            amount: amount.toString(),
            targetId: article.id,
            currency: PAYMENT_CURRENCY.USDT,
            provider: PAYMENT_PROVIDER.blockchain,
            providerTxId: blockchainTx.id,
          },
        })
      }

      // success both tx and blockchain tx
      await this.succeedBothTxAndBlockchainTx(tx.id, blockchainTx.id)
    } else {
      // still no related tx record, create a new one with anonymous sender
      // for sender who interacts with contract directly
      const trx = await this.knex.transaction()
      try {
        const newTx = {
          amount: amount.toString(),
          state: TRANSACTION_STATE.succeeded,
          purpose: TRANSACTION_PURPOSE.donation,
          currency: PAYMENT_CURRENCY.USDT,
          provider: PAYMENT_PROVIDER.blockchain,
          providerTxId: blockchainTx.id,
          recipientId: creatorUser.id,
          senderId: null, // anonymize sender
          targetId: article.id,
        }

        const [id] = await this.knex<Transaction>('transaction')
          .insert(newTx)
          .returning('id')
          .transacting(trx)

        // tx = { id, ...newTx }

        await this.knex<BlockchainTransaction>('blockchain_transaction')
          .where({ id: blockchainTx.id })
          .update({ transactionId: String(id) })
          .transacting(trx)

        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }

    if (creatorUser.userName && creatorUser.email) {
      await this.notifyDonation({
        tx: tx!,
        recipient: creatorUser as EmailableUser,
        article,
      })
    }

    if (tx) {
      await this.invalidCache(tx.targetType, tx.targetId)
    }
  }

  private _syncCurationEvents = async (
    logs: Array<Log<CurationEvent | CurationVaultEvent>>,
    chain: GQLChain
  ) => {
    const chainId = BLOCKCHAIN_CHAINID[chain]
    const curation = new CurationContract(chainId)
    const curationVault = new CurationVaultContract()

    // save events to `blockchain_curation_event`
    const events: Array<CurationEvent | CurationVaultEvent> = []
    for (const log of logs) {
      // skip if event is removed
      if (log.removed) {
        continue
      }

      const isCurationVaultEvent = 'creatorId' in log.event
      const data: (CurationEvent | CurationVaultEvent) & {
        blockchainTransactionId?: string
        contractAddress?: string
      } = { ...log.event }

      // Find or create blockchain transaction
      const existingTx = await this.models.findFirst({
        table: 'blockchain_transaction',
        where: { chainId, txHash: log.txHash as `0x${string}` },
      })

      let blockchainTx: BlockchainTransaction
      if (existingTx) {
        blockchainTx = existingTx
      } else {
        blockchainTx = await this.models.create({
          table: 'blockchain_transaction',
          data: {
            chainId,
            txHash: log.txHash as `0x${string}`,
            state: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
            from: log.event.curatorAddress as `0x${string}`,
            to: isCurationVaultEvent ? curationVault.address : curation.address,
            blockNumber: log.blockNumber.toString(),
            transactionId: null,
          },
        })
      }

      data.blockchainTransactionId = blockchainTx.id
      data.contractAddress = log.address

      // correct tx if needed
      try {
        await this.handleNewEvent(log.event, chain, blockchainTx)
      } catch (error) {
        console.error('Failed to handle new event', error)
      }

      events.push(data)
    }

    if (events.length > 0) {
      // Batch create blockchain curation events
      await this.knex<BlockchainCurationEvent>(
        'blockchain_curation_event'
      ).insert(events)
    }
  }

  private fetchCurationLogs = async (
    curation: CurationContract | CurationVaultContract,
    savepoint: bigint
  ): Promise<[Array<Log<CurationEvent | CurationVaultEvent>>, bigint]> => {
    const safeBlockNum =
      BigInt(await curation.fetchBlockNumber()) -
      BigInt(BLOCKCHAIN_SAFE_CONFIRMS[BLOCKCHAIN_CHAINNAME[curation.chainId]])

    const fromBlockNum = savepoint + BigInt(1)

    if (fromBlockNum >= safeBlockNum) {
      return [[], BigInt(savepoint)]
    }
    return [await curation.fetchLogs(fromBlockNum, safeBlockNum), safeBlockNum]
  }

  private updateTxAndBlockchainTxState = async ({
    txId,
    txState,
    txRemark,
    blockchainTxId,
    blockchainTxState,
  }: {
    txId: string
    txState: TRANSACTION_STATE
    txRemark?: string
    blockchainTxId: string
    blockchainTxState: string
  }) => {
    const trx = await this.knex.transaction()
    try {
      // Update transaction state
      await this.knex<Transaction>('transaction')
        .where({ id: txId })
        .update({
          state: txState,
          remark: txRemark,
          updatedAt: new Date(),
        })
        .transacting(trx)

      // Update blockchain transaction state
      await this.knex<BlockchainTransaction>('blockchain_transaction')
        .where({ id: blockchainTxId })
        .update({
          state: blockchainTxState,
          updatedAt: new Date(),
        })
        .transacting(trx)

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private succeedBothTxAndBlockchainTx = async (
    txId: string,
    blockchainTxId: string
  ) => {
    await this.updateTxAndBlockchainTxState({
      txId,
      txState: TRANSACTION_STATE.succeeded,
      blockchainTxId,
      blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
    })
  }

  private containMatchedEvent = async (
    events: CurationEvent[] | CurationVaultEvent[],
    {
      cids,
      shortHash,
      tokenAddress,
      amount,
      decimals,
    }: {
      cids: string[]
      shortHash: string
      tokenAddress: string
      amount: string
      decimals: number
    }
  ) => {
    if (events.length === 0) {
      return false
    }

    for (const event of events) {
      const { cid: eventCid, shortHash: eventShortHash } =
        extractCidOrShortHash(event.uri)
      const isCidMatch = eventCid ? cids.includes(eventCid) : false
      const isShortHashMatch = eventShortHash
        ? shortHash === eventShortHash
        : false

      if (
        ignoreCaseMatch(event.tokenAddress || '', tokenAddress) &&
        event.amount === parseUnits(amount, decimals).toString() &&
        isValidUri(event.uri) &&
        (isCidMatch || isShortHashMatch)
      ) {
        return true
      }
    }

    return false
  }

  private invalidCache = async (targetTypeId: string, targetId: string) => {
    // manually invalidate cache
    if (targetTypeId) {
      const entity = await this.baseFindEntityTypeTable(targetTypeId)
      const entityType = _capitalize(entity?.table) as NODE_TYPES
      if (entityType) {
        await invalidateFQC({
          node: { type: entityType, id: targetId },
          redis: this.redis,
        })
      }
    }
  }
  private findByEthAddress = async (ethAddress: string) =>
    this.models.findFirst({
      table: 'user',
      where: { ethAddress },
    })
}

const ignoreCaseMatch = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase()

const isValidUri = (uri: string): boolean =>
  /^ipfs:\/\//.test(uri) ||
  new RegExp(`^https://${process.env.MATTERS_SITE_DOMAIN}/a/[\\w-]+$`).test(uri)

const extractCidOrShortHash = (
  uri: string
): { cid?: string; shortHash?: string } => {
  // ipfs://{cid}
  if (uri.startsWith('ipfs://')) {
    return { cid: uri.replace('ipfs://', '') }
  }

  // https://matters.town/a/{shortHash}
  if (uri.startsWith('https://')) {
    const shortHash = uri.split('/').pop()?.split('?')[0]
    return { shortHash }
  }

  return {}
}
