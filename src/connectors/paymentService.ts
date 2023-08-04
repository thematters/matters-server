import DataLoader from 'dataloader'
import { Knex } from 'knex'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_TRANSACTION_STATE,
  DB_NOTICE_TYPE,
  INVITATION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { isProd } from 'common/environment'
import { ServerError } from 'common/errors'
import { getLogger } from 'common/logger'
import { getUTC8Midnight, numRound } from 'common/utils'
import { AtomService, BaseService, NotificationService } from 'connectors'
import { CirclePrice, GQLChain, Transaction, User } from 'definitions'

import { stripe } from './stripe'

const logger = getLogger('service-payment')

export class PaymentService extends BaseService {
  stripe: typeof stripe

  public constructor() {
    super('transaction')

    this.stripe = stripe

    this.dataloader = new DataLoader(this.baseFindByIds)
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

    return this.baseCreate(
      {
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
        remark,
      },
      undefined,
      undefined,
      undefined,
      trx
    )
  }

  public findBlockchainTransactionById = async (id: string) =>
    this.baseFindById(id, 'blockchain_transaction')

  public findOrCreateBlockchainTransaction = async (
    { chain, txHash }: { chain: GQLChain; txHash: string },
    data?: { state?: BLOCKCHAIN_TRANSACTION_STATE },
    trx?: Knex.Transaction
  ) => {
    const table = 'blockchain_transaction'
    const txHashDb = txHash.toLowerCase()

    let chainId
    if (chain.valueOf() === BLOCKCHAIN.Polygon.valueOf()) {
      chainId = isProd
        ? BLOCKCHAIN_CHAINID.Polygon.PolygonMainnet
        : BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai
    }
    const where = {
      txHash: txHashDb,
      chainId,
    }
    const toInsert = { ...where } as any
    if (data && data.state) {
      toInsert.state = data.state
    }
    return this.baseFindOrCreate({ where, data: toInsert, table, trx })
  }

  public findOrCreateTransactionByBlockchainTxHash = async ({
    chain,
    txHash,

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
    chain: GQLChain
    txHash: string

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
        { chain, txHash },
        undefined,
        trx
      )

      const provider = PAYMENT_PROVIDER.blockchain
      const providerTxId = blockchainTx.id

      let tx
      tx = await this.knex
        .select()
        .from(this.table)
        .where({ providerTxId, provider })
        .first()

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
        await this.knex('blockchain_transaction')
          .where({ id: blockchainTx.id })
          .update({ transactionId: tx.id })
          .transacting(trx)
      }
      await trx.commit()
      return tx
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  // Update blockchain_transaction's state by given id
  public markBlockchainTransactionStateAs = async (
    {
      id,
      state,
    }: {
      id: string
      state: BLOCKCHAIN_TRANSACTION_STATE
    },
    trx?: Knex.Transaction
  ) =>
    this.baseUpdate(
      id,
      { updatedAt: new Date(), state },
      'blockchain_transaction',
      trx
    )

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

    return this.baseUpdate(
      id,
      { updatedAt: new Date(), ...data },
      'transaction',
      trx
    )
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
    user: Pick<User, 'id' | 'email'>
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
          parentId: trans.id,
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

  /*********************************
   *                               *
   *         Subscription          *
   *                               *
   *********************************/
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
   *           notification        *
   *                               *
   *********************************/

  public notifyDonation = async ({
    tx,
    sender,
    recipient,
    article,
  }: {
    tx: Transaction
    sender: User
    recipient: User
    article: {
      title: string
      slug: string
      authorId: string
      mediaHash: string
      draftId: string
    }
  }) => {
    const atomService = new AtomService()
    const notificationService = new NotificationService()
    const amount = parseFloat(tx.amount)
    // send email to sender
    const author = await atomService.findFirst({
      table: 'user',
      where: { id: article.authorId },
    })
    const draft = await atomService.findFirst({
      table: 'draft',
      where: { id: article.draftId },
    })

    const hasReplyToDonator = !!draft.replyToDonator
    const _article = {
      id: tx.targetId,
      title: article.title,
      slug: article.slug,
      mediaHash: article.mediaHash,
      author: {
        displayName: author.displayName,
        userName: author.userName,
      },
      hasReplyToDonator,
    }

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

    // send email to recipient
    await notificationService.trigger({
      event: DB_NOTICE_TYPE.payment_received_donation,
      actorId: sender.id,
      recipientId: recipient.id,
      entities: [{ type: 'target', entityTable: 'transaction', entity: tx }],
    })

    const mailType =
      tx.currency === PAYMENT_CURRENCY.LIKE
        ? ('receivedDonationLikeCoin' as const)
        : ('receivedDonation' as const)

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
}
