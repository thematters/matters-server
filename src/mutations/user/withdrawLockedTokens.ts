import type { GQLMutationResolvers, Transaction } from 'definitions'

import {
  NOTICE_TYPE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  USER_STATE,
} from 'common/enums'
import {
  ForbiddenByStateError,
  ForbiddenError,
  ServerError,
} from 'common/errors'
import { CurationVaultContract } from 'connectors/blockchain/curationVault'

const resolver: GQLMutationResolvers['withdrawLockedTokens'] = async (
  _,
  __,
  { viewer, dataSources: { atomService, notificationService, paymentService } }
) => {
  // check user
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (
    [USER_STATE.archived, USER_STATE.frozen, USER_STATE.banned].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // skip if there is a pending withdrawal transaction
  const tx = await atomService.findFirst({
    table: 'transaction',
    where: {
      senderId: null,
      recipientId: viewer.id,
      purpose: TRANSACTION_PURPOSE.curationVaultWithdrawal,
      state: TRANSACTION_STATE.pending,
    },
  })
  if (tx) {
    throw new ForbiddenError('pending withdrawal transaction')
  }

  const contract = new CurationVaultContract()
  const client = await contract.getClient()

  // check withdraw amount
  const amount = await contract.getWithdrawableUSDTAmount(viewer.id)
  if (amount <= 0) {
    throw new ForbiddenError('no withdrawable amount')
  }

  let transaction: Transaction | null = null
  try {
    // submit transaction
    const result = await contract.withdraw(viewer.id)

    // create transaction
    transaction = await paymentService.createTransaction({
      state: TRANSACTION_STATE.pending,
      currency: PAYMENT_CURRENCY.USDT,
      purpose: TRANSACTION_PURPOSE.curationVaultWithdrawal,
      provider: PAYMENT_PROVIDER.blockchain,
      providerTxId: result.hash,
      amount: Number(amount),
      recipientId: viewer.id,
    })

    await client.waitForUserOperationTransaction(result)

    // mark as succeeded
    await paymentService.markTransactionStateAs({
      id: transaction.id,
      state: TRANSACTION_STATE.succeeded,
    })

    // notify
    await notificationService.trigger({
      event: NOTICE_TYPE.withdrew_locked_tokens,
      actorId: null,
      recipientId: viewer.id,
      entities: [
        { type: 'target', entityTable: 'transaction', entity: transaction },
      ],
    })
  } catch (error) {
    if (transaction) {
      await paymentService.markTransactionStateAs({
        id: transaction.id,
        state: TRANSACTION_STATE.failed,
      })
    }

    throw new ServerError('failed to withdraw locked tokens')
  }

  return { transaction }
}

export default resolver
