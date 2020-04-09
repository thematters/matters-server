import { v4 } from 'uuid'

import {
  BATCH_SIZE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
} from 'common/enums'
import { ServerError } from 'common/errors'
import { BaseService } from 'connectors'
import { User } from 'definitions'

import { stripe } from './stripe'

export class PaymentService extends BaseService {
  stripe: typeof stripe

  constructor() {
    super('noop')

    this.stripe = stripe
  }

  /*********************************
   *                               *
   *             Wallet            *
   *                               *
   *********************************/
  countBalance = async ({
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

  // count transactions by given conditions
  totalTransactionCount = async ({
    userId,
    uuid,
    states,
  }: {
    userId: string
    uuid?: string
    states?: TRANSACTION_STATE[]
  }) => {
    let qs = this.knex('transaction_delta_view').where({
      userId,
    })

    if (uuid) {
      qs = qs.where({ uuid })
    }

    if (states) {
      qs = qs.whereIn('state', states)
    }

    const result = await qs.count()
    return parseInt(`${result[0].count}` || '0', 10)
  }

  // find transactions by given conditions
  findTransactions = async ({
    userId,
    uuid,
    providerTxId,
    states,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    userId?: string
    uuid?: string
    providerTxId?: string
    states?: TRANSACTION_STATE[]
    offset?: number
    limit?: number
  }) => {
    let qs = this.knex('transaction_delta_view')

    if (userId) {
      qs = qs.where({ userId })
    }

    if (uuid) {
      qs = qs.where({ uuid })
    }

    if (providerTxId) {
      qs = qs.where({ providerTxId })
    }

    if (states) {
      qs = qs.whereIn('state', states)
    }

    return qs.orderBy('created_at', 'desc').offset(offset).limit(limit)
  }

  createTransaction = async ({
    amount,
    state = TRANSACTION_STATE.pending,
    purpose,
    currency = PAYMENT_CURRENCY.HKD,

    provider,
    providerTxId,
    refundedId,

    recipientId,
    senderId,
    targetId,
  }: {
    amount: number
    state?: TRANSACTION_STATE
    purpose: TRANSACTION_PURPOSE
    currency?: PAYMENT_CURRENCY

    provider: PAYMENT_PROVIDER
    providerTxId: string
    refundedId?: string

    recipientId?: string
    senderId?: string
    targetId?: string
  }) => {
    const uuid = v4()

    return this.baseCreate(
      {
        uuid,
        amount,
        state,
        currency,
        purpose,

        provider,
        providerTxId,
        refundedId,

        senderId,
        recipientId,
        targetId,
      },
      'transaction'
    )
  }

  // Update transaction's state by given id
  markTransactionStateAs = async ({
    id,
    state,
  }: {
    id: string
    state: TRANSACTION_STATE
  }) => {
    const data = {
      state,
    }

    return this.baseUpdate(
      id,
      { updatedAt: new Date(), ...data },
      'transaction'
    )
  }

  /*********************************
   *                               *
   *            Customer           *
   *                               *
   *********************************/
  findCustomer = async ({
    userId,
    customerId,
    provider,
  }: {
    userId?: string
    customerId?: string
    provider?: PAYMENT_PROVIDER
  }) => {
    let qs = this.knex('customer')

    if (userId) {
      qs = qs.where({ userId })
    }

    if (customerId) {
      qs = qs.where({ customerId })
    }

    if (provider) {
      qs = qs.where({ provider })
    }

    return qs
  }

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
      const payment = await this.stripe.createPaymentIntent({
        customerId,
        amount,
        currency,
      })

      // create a pending transaction from DB
      const transaction = await this.createTransaction({
        amount,
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
}
