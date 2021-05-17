import axios from 'axios'
import DataLoader from 'dataloader'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  BATCH_SIZE,
  HOUR,
  INVITATION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { environment } from 'common/environment'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import { getUTC8Midnight, numRound } from 'common/utils'
import { BaseService, CacheService } from 'connectors'
import { CirclePrice, User } from 'definitions'

import { stripe } from './stripe'

export class PaymentService extends BaseService {
  stripe: typeof stripe

  constructor() {
    super('transaction')

    this.stripe = stripe

    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  /*********************************
   *                               *
   *             Wallet            *
   *                               *
   *********************************/
  calculateBalance = async ({
    userId,
    currency,
  }: {
    userId: string
    currency: PAYMENT_CURRENCY
  }) => {
    const result = await this.knex('transaction_delta_view')
      .where({
        userId,
        currency,
        state: TRANSACTION_STATE.succeeded,
      })
      .sum('delta as total')
    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  makeTransactionsQuery = ({
    userId,
    id,
    providerTxId,
    states,
    excludeCanceledLIKE,
    notIn,
  }: {
    userId?: string
    id?: string
    providerTxId?: string
    states?: TRANSACTION_STATE[]
    excludeCanceledLIKE?: boolean
    notIn?: [string, string[]]
  }) => {
    let qs = this.knex('transaction_delta_view').select()

    if (userId) {
      qs = qs.where({ userId })
    }

    if (id) {
      qs = qs.where({ id })
    }

    if (providerTxId) {
      qs = qs.where({ providerTxId })
    }

    if (states) {
      qs = qs.whereIn('state', states)
    }

    if (excludeCanceledLIKE) {
      let subQs = this.knex('transaction_delta_view').where({
        userId,
      })

      if (id) {
        subQs = subQs.where({ id })
      }

      if (states) {
        subQs = subQs.whereIn('state', states)
      }

      qs = qs
        .leftJoin(
          subQs
            .select('id as tx_id')
            .where('state', TRANSACTION_STATE.canceled)
            .andWhere('currency', PAYMENT_CURRENCY.LIKE)
            .as('canceled_like_txs'),
          'transaction_delta_view.id',
          'canceled_like_txs.tx_id'
        )
        .whereNull('canceled_like_txs.tx_id')
    }

    if (notIn) {
      qs.whereNotIn(...notIn)
    }

    return qs
  }

  // count transactions by given conditions
  totalTransactionCount = async (params: {
    userId: string
    id?: string
    states?: TRANSACTION_STATE[]
    excludeCanceledLIKE?: boolean
    notIn?: [string, string[]]
  }) => {
    const qs = this.makeTransactionsQuery(params)
    const result = await qs.count()

    return parseInt(`${result[0].count}` || '0', 10)
  }

  // find transactions by given conditions
  findTransactions = ({
    offset = 0,
    limit = BATCH_SIZE,
    ...restParams
  }: {
    userId?: string
    id?: string
    providerTxId?: string
    states?: TRANSACTION_STATE[]
    excludeCanceledLIKE?: boolean
    notIn?: [string, string[]]
    offset?: number
    limit?: number
  }) => {
    const qs = this.makeTransactionsQuery(restParams)

    return qs.orderBy('created_at', 'desc').offset(offset).limit(limit)
  }

  createTransaction = async ({
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
  }: {
    amount: number
    fee?: number

    state: TRANSACTION_STATE
    purpose: TRANSACTION_PURPOSE
    currency?: PAYMENT_CURRENCY

    provider: PAYMENT_PROVIDER
    providerTxId: string

    recipientId?: string
    senderId?: string

    targetId?: string
    targetType?: TRANSACTION_TARGET_TYPE
  }) => {
    let targetTypeId
    if (targetId && targetType) {
      const { id: entityTypeId } = await this.baseFindEntityTypeId(targetType)
      targetTypeId = entityTypeId
    }

    return this.baseCreate({
      amount,
      fee,

      state,
      currency,
      purpose,

      provider,
      providerTxId,

      senderId,
      recipientId,
      targetId,
      targetType: targetTypeId,
    })
  }

  // Update transaction's state by given id
  markTransactionStateAs = async ({
    id,
    state,
    remark,
  }: {
    id: string
    state: TRANSACTION_STATE
    remark?: string | null
  }) => {
    const data = remark
      ? {
          state,
          remark,
        }
      : {
          state,
        }

    return this.baseUpdate(id, { updatedAt: new Date(), ...data })
  }

  /**
   * Sum up the amount of donation transaction.
   *
   */
  sumTodayDonationTransactions = async ({
    currency = PAYMENT_CURRENCY.HKD,
    senderId,
  }: {
    currency?: PAYMENT_CURRENCY
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
  createCustomer = async ({
    user,
    provider,
  }: {
    user: User
    provider: PAYMENT_PROVIDER
  }) => {
    if (provider === PAYMENT_PROVIDER.stripe) {
      const customer = await this.stripe.createCustomer({
        user,
      })

      if (!customer || !customer.id) {
        throw new ServerError('failed to create customer')
      }

      return this.baseCreate(
        {
          userId: user.id,
          provider,
          customerId: customer.id,
        },
        'customer'
      )
    }
  }

  deleteCustomer = async ({
    userId,
    customerId,
  }: {
    userId?: string
    customerId?: string
  }) => {
    if (!userId && !customerId) {
      throw new ServerError('userId/customerId is required')
    }

    let qs = this.knex('customer')

    if (userId) {
      qs = qs.where({ userId })
    }

    if (customerId) {
      qs = qs.where({ customerId })
    }

    return qs.del()
  }

  /*********************************
   *                               *
   *            Payment            *
   *                               *
   *********************************/
  createPayment = async ({
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
    currency: PAYMENT_CURRENCY
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
  calculateHKDBalance = async ({ userId }: { userId: string }) => {
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
      .sum('src.amount as amount')

    if (!result || !result[0]) {
      return 0
    }
    return parseInt(result[0].amount || 0, 10)
  }

  countPendingPayouts = async ({ userId }: { userId: string }) => {
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

  /**
   * Get the exchange rates from the Open Exchange Rates API and cache hourly.
   *
   */
  getUSDtoHKDRate = async (): Promise<number> => {
    const cacheService = new CacheService()
    const cacheKey = 'openExRate'
    const cacheTTl = HOUR / 1000

    const checkRate = ({ base, HKD }: { base: string; HKD: number }) => {
      const MAX_USD_TO_HKD_RATE = 10

      if (base !== 'USD') {
        throw new Error('rate base is not USD.')
      }

      if (!HKD || typeof HKD !== 'number') {
        throw new Error('invalid HKD rate.')
      }

      if (HKD >= MAX_USD_TO_HKD_RATE) {
        throw new Error(`HKD rate (${HKD}) >= ${MAX_USD_TO_HKD_RATE}.`)
      }
    }

    // get from cache
    const cachedRates = JSON.parse(
      (await cacheService.redis.get(cacheKey)) || JSON.stringify('')
    )

    if (cachedRates) {
      checkRate(cachedRates)
      return cachedRates.HKD
    }

    // get from API, then cache it
    const { data } = await axios.get(
      `https://openexchangerates.org/api/latest.json?app_id=${environment.openExchangeRatesAppId}`
    )
    const rates = {
      base: _.get(data, 'base'),
      HKD: _.get(data, 'rates.HKD'),
    }

    checkRate(rates)

    const serializedData = JSON.stringify(rates)
    cacheService.redis.client.set(cacheKey, serializedData, 'EX', cacheTTl)

    return rates.HKD
  }

  /*********************************
   *                               *
   *             Invoice           *
   *                               *
   *********************************/
  findInvoice = async ({
    id,
    userId,
    providerInvoiceId,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    id?: number
    userId?: number
    providerInvoiceId?: string
    offset?: number
    limit?: number
  }) => {
    let qs = this.knex('circle_invoice').select()

    if (userId) {
      qs = qs.where({ userId })
    }

    if (id) {
      qs = qs.where({ id })
    }

    if (providerInvoiceId) {
      qs = qs.where({ providerInvoiceId })
    }

    return qs.orderBy('created_at', 'desc').offset(offset).limit(limit)
  }

  createInvoiceWithTransactions = async ({
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
      const transactionId = await trx('transaction')
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
        .returning('id')

      // create circle invoice
      await trx('circle_invoice')
        .insert({
          userId,
          transactionId: transactionId[0],
          subscriptionId,
          provider: PAYMENT_PROVIDER.stripe,
          providerInvoiceId,
        })
        .returning('id')

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
        const circle = await this.baseFindById(p.circleId, 'circle')
        await trx('transaction').insert({
          amount: p.amount,
          currency: p.currency,
          state: TRANSACTION_STATE.succeeded,
          purpose: TRANSACTION_PURPOSE.subscriptionSplit,

          provider: PAYMENT_PROVIDER.matters,
          providerTxId: v4(),

          senderId: userId,
          recipientId: circle.owner,

          targetType: entityTypeId,
          targetId: p.id,
          remark: `stripe:${providerTxId}`,
        })
      }
      await trx.commit()

      logger.info(
        `invoice '${providerInvoiceId}' has been successfully paid and splitted.`
      )
    } catch (e) {
      await trx.rollback()
      throw e
    }
  }

  /*********************************
   *                               *
   *         Subscription          *
   *                               *
   *********************************/
  /**
   * Check if user is circle member
   */
  isCircleMember = async ({
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

  findActiveSubscriptions = async ({
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
      ])

    return subscriptions || []
  }

  createSubscriptionOrItem = async (data: {
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

    if (
      (targetMattersSub && !hasMattersSub) ||
      (targetStripeSub && !hasStripeSub)
    ) {
      await this.createSubscription({ ...data, invitation })
    } else {
      await this.createSubscriptionItem({ ...data, invitation })
    }
  }

  /**
   * Create a subscription by a given circle price,
   * subscription item will be created correspondingly.
   */
  createSubscription = async ({
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
  createSubscriptionItem = async ({
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
  findPendingInvitation = async (params: {
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
        state: INVITATION_STATE.pending,
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
  acceptInvitation = async (ivtId: string, subscriptionItemId: string) => {
    await this.knex('circle_invitation')
      .where('id', ivtId)
      .update({
        accepted: true,
        state: INVITATION_STATE.accepted,
        accepted_at: this.knex.fn.now(),
        subscriptionItemId,
      })
      .returning('*')
  }
}
