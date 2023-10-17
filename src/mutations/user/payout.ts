import type { GQLMutationResolvers } from 'definitions'

import { compare } from 'bcrypt'
import { v4 } from 'uuid'

import {
  PAYMENT_CURRENCY,
  PAYMENT_MINIMAL_PAYOUT_AMOUNT,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  USER_STATE,
} from 'common/enums'
import {
  ForbiddenByStateError,
  EntityNotFoundError,
  PasswordInvalidError,
  PaymentAmountTooSmallError,
  PaymentBalanceInsufficientError,
  PaymentPasswordNotSetError,
  PaymentPayoutTransactionExistsError,
  UserInputError,
} from 'common/errors'
import { calcMattersFee } from 'common/utils'

const resolver: GQLMutationResolvers['payout'] = async (
  _,
  { input: { amount, password } },
  {
    viewer,
    dataSources: {
      atomService,
      paymentService,
      queues: { payoutQueue },
    },
  }
) => {
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new UserInputError('amount is incorrect')
  }

  if (amount < PAYMENT_MINIMAL_PAYOUT_AMOUNT.HKD) {
    throw new PaymentAmountTooSmallError(
      `The minimal amount is ${PAYMENT_MINIMAL_PAYOUT_AMOUNT.HKD}`
    )
  }

  if (viewer.state === USER_STATE.banned) {
    throw new ForbiddenByStateError('banned user has no permission')
  }

  if (!viewer.paymentPasswordHash) {
    throw new PaymentPasswordNotSetError('viewer payment password has not set')
  }

  const verified = await compare(password, viewer.paymentPasswordHash)
  if (!verified) {
    throw new PasswordInvalidError('password is incorrect, payment failed.')
  }

  const [balance, pending, payoutAccount] = await Promise.all([
    paymentService.calculateHKDBalance({
      userId: viewer.id,
    }),
    paymentService.countPendingPayouts({ userId: viewer.id }),
    atomService.findFirst({
      table: 'payout_account',
      where: {
        userId: viewer.id,
        capabilitiesTransfers: true,
        archived: false,
      },
    }),
  ])

  if (pending > 0) {
    throw new PaymentPayoutTransactionExistsError(
      'viewer already has ongoing payouts'
    )
  }

  if (amount > balance) {
    throw new PaymentBalanceInsufficientError('viewer has insufficient balance')
  }

  const recipient = payoutAccount
  if (!recipient || !recipient.accountId) {
    throw new EntityNotFoundError(`payout recipient is not found`)
  }

  // insert pending tx
  const fee = calcMattersFee(amount)
  const transaction = await paymentService.createTransaction({
    amount,
    currency: PAYMENT_CURRENCY.HKD,
    fee,
    state: TRANSACTION_STATE.pending,
    purpose: TRANSACTION_PURPOSE.payout,
    provider: PAYMENT_PROVIDER.stripe,
    providerTxId: v4(),
    senderId: viewer.id,
    targetType: undefined,
  })

  // insert queue job
  payoutQueue.payout({ txId: transaction.id })

  return transaction
}

export default resolver
