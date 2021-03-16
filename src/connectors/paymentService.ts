import DataLoader from 'dataloader'
import { v4 } from 'uuid'

import {
  BATCH_SIZE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import {
  calcMattersFee,
  // calcStripeFee,
  getUTC8Midnight,
  numRound,
} from 'common/utils'
import { BaseService } from 'connectors'
import { CirclePrice, Customer, User } from 'definitions'

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

    state = TRANSACTION_STATE.pending,
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

    state?: TRANSACTION_STATE
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

  getCustomerPortal = async ({ userId }: { userId: string }) => {
    // retrieve customer
    const customer = (await this.knex
      .select()
      .from('customer')
      .where({
        userId,
        provider: PAYMENT_PROVIDER.stripe,
        archived: false,
      })
      .first()) as Customer

    if (customer) {
      const customerId = customer.customerId
      return this.stripe.getCustomerPortal({ customerId })
    }
    return null
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
  createPayoutAccount = async ({
    user,
    accountId,
    type = PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE.express,
    provider = PAYMENT_PROVIDER.stripe,
  }: {
    user: User
    accountId: string
    type?: PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE.express
    provider?: PAYMENT_PROVIDER.stripe
  }) => {
    return this.baseCreate(
      {
        userId: user.id,
        accountId,
        type,
        provider,
      },
      'payout_account'
    )
  }

  createPayout = async ({
    amount,
    recipientId,
    recipientStripeConnectedId,
  }: {
    amount: number
    recipientId: string
    recipientStripeConnectedId: string
  }) => {
    const fee = calcMattersFee(amount)

    // create stripe payment
    const payment = await this.stripe.createDestinationCharge({
      amount,
      currency: PAYMENT_CURRENCY.HKD,
      fee,
      recipientStripeConnectedId,
    })

    if (!payment) {
      throw new ServerError('failed to create payment')
    }

    // create pending matters transaction. To make number of wallet
    // balance right, set recipient as sender here.
    return this.createTransaction({
      amount,
      currency: PAYMENT_CURRENCY.HKD,
      fee,
      purpose: TRANSACTION_PURPOSE.payout,
      provider: PAYMENT_PROVIDER.stripe,
      providerTxId: payment.id,
      senderId: recipientId,
      targetType: undefined,
    })
  }

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

  findSubscriptions = async ({ userId }: { userId: string }) => {
    const subscriptions = await this.knex
      .select()
      .from('circle_subscription')
      .where({ userId })
      .whereIn('state', [
        SUBSCRIPTION_STATE.active,
        SUBSCRIPTION_STATE.trialing,
      ])

    return subscriptions || []
  }

  /**
   * Create a subscription by a given circle price
   */
  createSubscription = async (data: {
    userId: string
    priceId: string
    providerCustomerId: string
    providerPriceId: string
  }) => {
    const { userId, priceId, providerCustomerId, providerPriceId } = data

    // Create from Stripe
    const stripeSubscription = await this.stripe.createSubscription({
      customer: providerCustomerId,
      price: providerPriceId,
    })

    if (!stripeSubscription) {
      throw new ServerError('failed to create stripe subscription')
    }

    // Save to DB
    const [subscription] = await this.knex('circle_subscription')
      .insert({
        providerSubscriptionId: stripeSubscription.id,
        state: stripeSubscription.status,
        userId,
      })
      .returning('*')

    await this.knex('circle_subscription_item')
      .insert({
        priceId,
        providerSubscriptionItemId: stripeSubscription.items.data[0].id,
        subscriptionId: subscription.id,
        userId,
      })
      .returning('*')
  }

  /**
   * Create a subscription item by a given circle price
   */
  createSubscriptionItem = async (data: {
    userId: string
    priceId: string
    subscriptionId: string
    providerPriceId: string
    providerSubscriptionId: string
  }) => {
    const {
      userId,
      priceId,
      subscriptionId,
      providerPriceId,
      providerSubscriptionId,
    } = data

    // Create from Stripe
    const stripeItem = await this.stripe.createSubscriptionItem({
      price: providerPriceId,
      subscription: providerSubscriptionId,
    })

    if (!stripeItem) {
      throw new ServerError('failed to create stripe subscription item')
    }

    await this.knex('circle_subscription_item')
      .insert({
        priceId,
        providerSubscriptionItemId: stripeItem.id,
        subscriptionId,
        userId,
      })
      .returning('*')
  }
}
