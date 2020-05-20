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

  const [balance, customer] = await Promise.all([
    paymentService.calculateBalance({
      userId: viewer.id,
      currency: PAYMENT_CURRENCY.HKD,
    }),
    // paymentService.findPayoutAccount({ userId: viewer.id })
  ])

  if (amount > balance) {
    throw new PaymentBalanceInsufficientError('viewer has insufficient balance')
  }

  // if (!customer || !customer.accountId) {
  //   throw new EntityNotFoundError(`customer is not found`)
  // }

  // const transaction = await paymentService.createPayout({
  //   amount,
  //   recipientId: viewer.id,
  //   recipientStripeConnectedId: customer.accountId
  // })

  // return transaction
  return {}
}

export default resolver
