import type {
  BlockchainTransaction,
  GQLMutationResolvers,
} from '#definitions/index.js'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_EXPLORER,
  BLOCKCHAIN_TRANSACTION_STATE,
  NOTICE_TYPE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  SLACK_MESSAGE_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { contract as contractEnv } from '#common/environment.js'
import {
  ForbiddenByStateError,
  ForbiddenError,
  ServerError,
} from '#common/errors.js'
import { CurationVaultContract } from '#connectors/blockchain/curationVault.js'
import SlackService from '#connectors/slack/index.js'
import * as Sentry from '@sentry/node'
import { v4 } from 'uuid'
import { formatUnits } from 'viem'

const resolver: GQLMutationResolvers['withdrawLockedTokens'] = async (
  _,
  __,
  {
    viewer,
    dataSources: {
      atomService,
      notificationService,
      paymentService,
      connections: { knex },
    },
  }
) => {
  // check user
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (!viewer.ethAddress) {
    throw new ForbiddenError('user has no linked wallet')
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
    return { transaction: tx }
  }

  const contract = new CurationVaultContract()
  const client = await contract.getClient()
  const slack = new SlackService()

  // check withdraw amount
  const vaultAmount = await contract.getWithdrawableUSDTAmount(viewer.id)
  if (vaultAmount <= 0) {
    throw new ForbiddenError('no withdrawable amount')
  }
  const amount = parseFloat(
    formatUnits(BigInt(vaultAmount), contractEnv.Optimism.tokenDecimals)
  )

  // create a pending transaction
  const transaction = await paymentService.createTransaction({
    state: TRANSACTION_STATE.pending,
    currency: PAYMENT_CURRENCY.USDT,
    purpose: TRANSACTION_PURPOSE.curationVaultWithdrawal,
    provider: PAYMENT_PROVIDER.blockchain,
    providerTxId: v4(),
    amount,
    recipientId: viewer.id,
  })

  let blockchainTx: BlockchainTransaction | null = null
  try {
    // submit transaction
    const result = await contract.withdraw(viewer.id, viewer.ethAddress)

    // wait for the transaction to be confirmed
    const txHash = await client.waitForUserOperationTransaction(result)

    // create a blockchain transaction and link to the transaction
    const trx = await knex.transaction()
    blockchainTx = await paymentService.findOrCreateBlockchainTransaction(
      { chainId: contract.chainId, txHash },
      undefined,
      trx
    )
    await trx
      .where({ id: transaction.id })
      .update({
        providerTxId: blockchainTx.id,
        state: TRANSACTION_STATE.succeeded,
      })
      .into('transaction')
      .returning('*')
      .transacting(trx)
    await trx('blockchain_transaction')
      .where({ id: blockchainTx.id })
      .update({
        transactionId: transaction.id,
        state: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
      })
      .transacting(trx)
    await trx.commit()

    // notify
    await notificationService.trigger({
      event: NOTICE_TYPE.withdrew_locked_tokens,
      actorId: null,
      recipientId: viewer.id,
      entities: [
        { type: 'target', entityTable: 'transaction', entity: transaction },
      ],
    })

    slack.sendVaultWithdrawMessage({
      amount: transaction.amount,
      state: SLACK_MESSAGE_STATE.successful,
      txDbId: transaction.id,
      userName: viewer.userName,
      txHash: `${BLOCKCHAIN_EXPLORER[BLOCKCHAIN.Optimism].url}/tx/${txHash}`,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error(error)

    await paymentService.markTransactionStateAs({
      id: transaction.id,
      state: TRANSACTION_STATE.failed,
    })

    if (blockchainTx) {
      await paymentService.markBlockchainTransactionStateAs({
        id: blockchainTx.id,
        state: BLOCKCHAIN_TRANSACTION_STATE.reverted,
      })
    }

    // notify
    await notificationService.trigger({
      event: NOTICE_TYPE.withdrew_locked_tokens,
      actorId: null,
      recipientId: viewer.id,
      entities: [
        { type: 'target', entityTable: 'transaction', entity: transaction },
      ],
    })

    slack.sendVaultWithdrawMessage({
      amount: transaction.amount,
      state: SLACK_MESSAGE_STATE.failed,
      txDbId: transaction.id,
      userName: viewer.userName,
    })

    throw new ServerError('failed to withdraw locked tokens')
  }

  return { transaction }
}

export default resolver
