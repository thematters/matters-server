import { compare } from 'bcrypt'
import { v4 } from 'uuid'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_TARGET_TYPE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenError,
  PasswordInvalidError,
  UserInputError,
  UserNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPayToResolver } from 'definitions'

const resolver: MutationToPayToResolver = async (
  parent,
  { input: { amount, currency, password, purpose, recipientId, targetId } },
  {
    viewer,
    dataSources: {
      articleService,
      paymentService,
      userService,
      notificationService,
    },
  }
) => {
  // params validators
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!viewer.paymentPasswordHash) {
    throw new ForbiddenError('viewr payment password has not set')
  }

  // keep purpose params for future usage, but only allow donation for now
  if (TRANSACTION_PURPOSE[purpose] !== TRANSACTION_PURPOSE.donation) {
    throw new UserInputError('now only support donation')
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new UserInputError('amount is incorrect')
  }

  // pre-process params
  const { id: recipientDbId } = fromGlobalId(recipientId || '')
  const { id: targetDbId, type: targetType } = fromGlobalId(targetId || '')

  const services: Record<string, any> = { Article: articleService }
  const targetService = services[targetType]

  // fetch entities
  const [recipient, target] = await Promise.all([
    userService.baseFindById(recipientDbId),
    targetService ? targetService.baseFindById(targetDbId) : undefined,
  ])

  // safety checks
  if (!recipient) {
    throw new UserNotFoundError('recipient is not found')
  }

  if (
    viewer.state === USER_STATE.archived ||
    recipient.state === USER_STATE.archived
  ) {
    throw new ForbiddenError('viewer or recipient has no permission')
  }

  if (!target || target.state === 'archived') {
    throw new EntityNotFoundError(`entity ${targetId} is not found`)
  }

  const verified = await compare(password, viewer.paymentPasswordHash)
  if (!verified) {
    throw new PasswordInvalidError('password is incorrect, pay failed.')
  }

  let transaction
  let redirectUrl

  switch (currency) {
    case 'LIKE':
      if (!viewer.likerId || !recipient.likerId) {
        throw new ForbiddenError('viewer or recipient has no liker id')
      }
      // insert a pending transaction
      const pendingTxId = v4()
      transaction = await paymentService.createTransaction({
        amount,
        fee: 0,
        currency: PAYMENT_CURRENCY[currency],
        purpose: TRANSACTION_PURPOSE[purpose],
        provider: PAYMENT_PROVIDER.likecoin,
        providerTxId: pendingTxId,
        recipientId: recipient.id,
        senderId: viewer.id,
        targetId: target.id,
      })

      const {
        likecoinPayURL,
        likecoinPayCallbackURL,
        likecoinPayLikerId,
      } = environment
      const params = new URLSearchParams()
      params.append('to', recipient.likerId)
      params.append('amount', amount.toString())
      params.append('via', likecoinPayLikerId)
      params.append('fee', '0')
      params.append('state', pendingTxId)
      params.append('redirect_uri', likecoinPayCallbackURL)

      redirectUrl = `${likecoinPayURL}?${params}`
      break
  }

  /**
   * trigger notifications
   */
  // send to sender
  notificationService.mail.sendPayment({
    to: viewer.email,
    recipient: {
      displayName: viewer.displayName,
      userName: viewer.userName,
    },
    type: 'donated',
    tx: {
      recipient,
      sender: viewer,
      amount: `${transaction.amount} ${transaction.currency}`,
    },
  })

  // send to recipient
  notificationService.trigger({
    event: 'payment_received_donation',
    actorId: viewer.id,
    recipientId: recipient.id,
    entities: [
      {
        type: 'target',
        entityTable: 'transaction',
        entity: transaction,
      },
    ],
  })
  notificationService.mail.sendPayment({
    to: recipient.email,
    recipient: {
      displayName: recipient.displayName,
      userName: recipient.userName,
    },
    type: currency === 'LIKE' ? 'receivedDonationLikeCoin' : 'receivedDonation',
    tx: {
      recipient,
      sender: viewer,
      amount: `${transaction.amount} ${transaction.currency}`,
    },
  })

  return { transaction, redirectUrl }
}

export default resolver
