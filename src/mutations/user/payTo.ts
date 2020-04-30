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
  { viewer, dataSources: { articleService, paymentService, userService } }
) => {
  // params validators
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
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
  const [user, recipient, target] = await Promise.all([
    userService.baseFindById(viewer.id),
    userService.baseFindById(recipientDbId),
    targetService ? targetService.baseFindById(targetDbId) : undefined,
  ])

  // safety checks
  if (!user || !recipient) {
    throw new UserNotFoundError('user is not found')
  }

  if (
    user.state === USER_STATE.archived ||
    recipient.state === USER_STATE.archived
  ) {
    throw new ForbiddenError('viewer or recipient has no permission')
  }

  if (!target || target.state === 'archived') {
    throw new EntityNotFoundError(`entity ${targetId} is not found`)
  }

  const verified = await compare(password, user.paymentPasswordHash)
  if (!verified) {
    throw new PasswordInvalidError('password is incorrect, pay failed.')
  }

  switch (currency) {
    case 'LIKE':
      if (!viewer.likerId) {
        throw new ForbiddenError('viewer has no liker id')
      }
      // insert a pending transaction
      const pendingTxId = v4()
      const transaction = await paymentService.createTransaction({
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
      params.append('to', user.likerId)
      params.append('amount', amount.toString())
      params.append('via', likecoinPayLikerId)
      params.append('fee', '0')
      params.append('state', pendingTxId)
      params.append('redirect_uri', likecoinPayCallbackURL)
      return { transaction, redirectUrl: `${likecoinPayURL}?${params}` }
  }

  return {}
}

export default resolver
