import DataLoader from 'dataloader'

import {
  BATCH_SIZE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { ServerError } from 'common/errors'
import { calcStripeFee, toProviderAmount } from 'common/utils'
import { BaseService } from 'connectors'
import { User } from 'definitions'

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

  // count transactions by given conditions
  totalTransactionCount = async ({
    userId,
    id,
    states,
  }: {
    userId: string
    id?: string
    states?: TRANSACTION_STATE[]
  }) => {
    let qs = this.knex('transaction_delta_view').where({
      userId,
    })

    if (id) {
      qs = qs.where({ id })
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
    id,
    providerTxId,
    states,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    userId?: string
    id?: string
    providerTxId?: string
    states?: TRANSACTION_STATE[]
    offset?: number
    limit?: number
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
  }: {
    id: string
    state: TRANSACTION_STATE
  }) => {
    const data = {
      state,
    }

    return this.baseUpdate(id, { updatedAt: new Date(), ...data })
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
      const fee = calcStripeFee(amount)
      const payment = await this.stripe.createPaymentIntent({
        customerId,
        amount: amount + fee,
        currency,
      })

      if (!payment) {
        throw new ServerError('failed to create payment')
      }

      // create a pending transaction from DB
      const transaction = await this.createTransaction({
        amount,
        fee,
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
