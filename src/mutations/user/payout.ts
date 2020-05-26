import { compare } from 'bcrypt'
import { v4 } from 'uuid'

import {
  PAYMENT_CURRENCY,
  PAYMENT_MAXIMUM_AMOUNT,
  PAYMENT_PAYOUT_MINIMUM_AMOUNT,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
} from 'common/enums'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenError,
  PasswordInvalidError,
  PaymentBalanceInsufficientError,
  PaymentReachMaximumLimitError,
  UserInputError,
} from 'common/errors'
import { calcMattersFee } from 'common/utils'
import { MutationToPayoutResolver } from 'definitions'

const resolver: MutationToPayoutResolver = async (
  parent,
  { input: { amount, password } },
  { viewer, dataSources: { paymentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new UserInputError('amount is incorrect')
  }

  if (amount < PAYMENT_PAYOUT_MINIMUM_AMOUNT.HKD) {
    throw new UserInputError('amount below minimum limit')
  }

  if (!viewer.paymentPasswordHash) {
    throw new ForbiddenError('viewer payment password has not set')
  }

  const verified = await compare(password, viewer.paymentPasswordHash)
  if (!verified) {
    throw new PasswordInvalidError('password is incorrect, payment failed.')
  }

  const [balance, pending, customer] = await Promise.all([
    paymentService.calculateBalance({
      userId: viewer.id,
      currency: PAYMENT_CURRENCY.HKD,
    }),
    paymentService.calculatePayoutPending({
      senderId: viewer.id,
      currency: PAYMENT_CURRENCY.HKD,
    }),
    paymentService.findPayoutAccount({ userId: viewer.id }),
  ])

  if (amount > balance - pending) {
    throw new PaymentBalanceInsufficientError('viewer has insufficient balance')
  }

  const recipient = customer[0]
  if (!recipient || !recipient.accountId) {
    throw new EntityNotFoundError(`payout recipient is not found`)
  }

  const transaction = await paymentService.createPayout({
    amount,
    recipientId: viewer.id,
    recipientStripeConnectedId: recipient.accountId,
  })

  return transaction
}

export default resolver
