import type { GQLMutationResolvers } from 'definitions'

import { compare } from 'bcrypt'
import { v4 } from 'uuid'

import {
  BLOCKCHAIN_CHAINID,
  PAYMENT_CURRENCY,
  PAYMENT_MAXIMUM_PAYTO_AMOUNT,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EntityNotFoundError,
  ForbiddenByStateError,
  ForbiddenByTargetStateError,
  ForbiddenError,
  PasswordInvalidError,
  PaymentBalanceInsufficientError,
  PaymentPasswordNotSetError,
  PaymentReachMaximumLimitError,
  UserInputError,
  UserNotFoundError,
} from 'common/errors'
import { fromGlobalId, isValidTransactionHash } from 'common/utils'

const resolver: GQLMutationResolvers['payTo'] = async (
  _,
  {
    input: {
      amount,
      currency,
      password,
      purpose: _purpose,
      recipientId,
      targetId,
      chain,
      txHash,
      id: txId,
    },
  },
  {
    viewer,
    dataSources: {
      atomService,
      articleService,
      paymentService,
      userService,
      queues: { payToByMattersQueue, payToByBlockchainQueue },
    },
  }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  // check purpose
  // keep purpose params for future usage, but only allow donation for now
  const purpose = TRANSACTION_PURPOSE[_purpose]
  if (purpose !== TRANSACTION_PURPOSE.donation) {
    throw new UserInputError('now only support donation')
  }

  // check amount
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new UserInputError('amount is incorrect')
  }

  // check target and recipient
  const { id: recipientDbId } = fromGlobalId(recipientId || '')
  const { id: targetDbId, type: targetType } = fromGlobalId(targetId || '')

  // only allow article target for now
  const isArticleTarget = targetType === 'Article'
  if (targetType !== 'Article') {
    throw new UserInputError(`now only support article target`)
  }

  const services = { Article: articleService }
  const targetService = services[targetType]
  const [recipient, target] = await Promise.all([
    userService.baseFindById(recipientDbId),
    targetService ? targetService.baseFindById(targetDbId) : undefined,
  ])

  if (!recipient) {
    throw new UserNotFoundError('recipient is not found')
  }

  if (recipient.id === viewer.id) {
    throw new ForbiddenError('cannot payTo yourself')
  }

  if (
    [USER_STATE.archived, USER_STATE.frozen, USER_STATE.banned].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (
    recipient.state === USER_STATE.archived ||
    recipient.state === USER_STATE.frozen
  ) {
    throw new ForbiddenByTargetStateError(
      `cannot pay-to ${recipient.state} user`
    )
  }

  if (!target || target.state === 'archived') {
    throw new EntityNotFoundError(`entity ${targetId} is not found`)
  }

  if (isArticleTarget && target.authorId !== recipientDbId) {
    throw new UserInputError('target author is not the same as the recipient')
  }

  // check password for Stripe
  if (PAYMENT_CURRENCY[currency] === PAYMENT_CURRENCY.HKD) {
    if (!viewer.paymentPasswordHash) {
      throw new PaymentPasswordNotSetError(
        'viewer payment password has not set'
      )
    }

    const verified = await compare(password || '', viewer.paymentPasswordHash)
    if (!verified) {
      throw new PasswordInvalidError('password is incorrect, pay failed.')
    }
  }

  // check tx
  const txDbId = txId ? fromGlobalId(txId).id : undefined
  if (txDbId) {
    const tx = await atomService.findUnique({
      table: 'transaction',
      where: { id: txDbId },
    })
    if (
      !tx ||
      tx.senderId !== viewer.id ||
      tx.recipientId !== recipient.id ||
      tx.targetId !== target.id ||
      parseFloat(tx.amount) !== amount ||
      tx.currency !== currency ||
      tx.purpose !== purpose ||
      tx.state !== TRANSACTION_STATE.pending
    ) {
      throw new UserInputError('no matching transaction')
    }
  }

  let transaction
  let redirectUrl

  const baseParams = {
    amount,
    fee: 0,
    recipientId: recipient.id,
    senderId: viewer.id,
    targetId: target.id,
  }

  if (currency === PAYMENT_CURRENCY.LIKE) {
    if (!viewer.likerId || !recipient.likerId) {
      throw new ForbiddenError('viewer or recipient has no liker id')
    }
    // insert a pending transaction
    const { id: targetTypeId } = await targetService.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )
    const pendingTxId = `${v4()}-${targetTypeId}-${target.id}`
    transaction = await paymentService.createTransaction({
      ...baseParams,
      state: TRANSACTION_STATE.pending,
      currency,
      purpose,
      provider: PAYMENT_PROVIDER.likecoin,
      providerTxId: pendingTxId,
    })

    const { likecoinPayURL, likecoinPayCallbackURL, likecoinPayLikerId } =
      environment
    const params = new URLSearchParams()
    params.append('to', recipient.likerId)
    params.append('amount', amount.toString())
    params.append('via', likecoinPayLikerId)
    params.append('fee', '0')
    params.append('state', pendingTxId)
    params.append('redirect_uri', likecoinPayCallbackURL)
    params.append('blocking', 'true')

    redirectUrl = `${likecoinPayURL}?${params}`
  } else if (currency === PAYMENT_CURRENCY.HKD) {
    const balance = await paymentService.calculateHKDBalance({
      userId: viewer.id,
    })
    if (amount > balance) {
      throw new PaymentBalanceInsufficientError(
        'viewer has insufficient balance'
      )
    }

    if (amount > PAYMENT_MAXIMUM_PAYTO_AMOUNT.HKD) {
      throw new PaymentReachMaximumLimitError('payment reached maximum limit')
    }

    const hasPaidAmount = await paymentService.sumTodayDonationTransactions({
      senderId: viewer.id,
    })
    if (amount + hasPaidAmount > PAYMENT_MAXIMUM_PAYTO_AMOUNT.HKD) {
      throw new PaymentReachMaximumLimitError(
        'payment reached daily maximum limit'
      )
    }

    // insert pending tx
    transaction = await paymentService.createTransaction({
      ...baseParams,
      state: TRANSACTION_STATE.pending,
      currency,
      purpose,
      provider: PAYMENT_PROVIDER.matters,
      providerTxId: v4(),
    })

    // insert queue job
    payToByMattersQueue.payTo({ txId: transaction.id })
  } else if (currency === PAYMENT_CURRENCY.USDT) {
    if (!chain) {
      throw new UserInputError('`chain` is required if `currency` is `USDT`')
    }
    if (chain === 'Polygon') {
      throw new UserInputError('Polygon is deprecated')
    }

    // create draft tx only
    if (!txHash) {
      transaction = await paymentService.createTransaction({
        ...baseParams,
        state: TRANSACTION_STATE.pending,
        currency,
        purpose,
        provider: PAYMENT_PROVIDER.blockchain,
        // will be corrected to blockchainTx.id on settlement
        // @see {paymentService.ts#findOrCreateTransactionByBlockchainTxHash}
        providerTxId: v4(),
      })
    }
    // try to settle the tx with on-chain tx
    else {
      if (!isValidTransactionHash(txHash)) {
        throw new UserInputError('invalid transaction hash')
      }

      transaction =
        await paymentService.findOrCreateTransactionByBlockchainTxHash({
          ...baseParams,
          chainId: BLOCKCHAIN_CHAINID[chain],
          txHash,
          txId: txDbId,
          state: TRANSACTION_STATE.pending,
          currency: PAYMENT_CURRENCY.USDT,
          purpose,
        })

      payToByBlockchainQueue.payTo({ txId: transaction.id })
    }
  }

  return { transaction, redirectUrl }
}

export default resolver
