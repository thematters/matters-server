import type { Log } from '@ethersproject/abstract-provider'
import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'
import { ethers } from 'ethers'
import _capitalize from 'lodash/capitalize'

import {
  BLOCKCHAIN_TRANSACTION_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  TRANSACTION_REMARK,
  TRANSACTION_STATE,
} from 'common/enums'
import { environment, USDTContractAddress } from 'common/environment'
import { PaymentQueueJobDataError } from 'common/errors'
import { getProvider, getQueueNameForEnv, numRound } from 'common/utils'
// import { environment } from 'common/environment'
import { PaymentService } from 'connectors'

import { BaseQueue } from '../baseQueue'

interface PaymentParams {
  txId: string
}

class PayToByBlockchainQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>
  txTimeout: number

  constructor() {
    super(getQueueNameForEnv(QUEUE_NAME.payToByBlockchain))
    this.paymentService = new PaymentService()
    this.addConsumers()
    this.txTimeout = 36000000 // 10 mins
  }

  /**
   * Producer for payTo.
   *
   */
  payTo = ({ txId }: PaymentParams) => {
    return this.q.add(
      QUEUE_JOB.payTo,
      { txId },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: false,
      }
    )
  }

  private addConsumers = () => {
    this.q.process(
      QUEUE_JOB.payTo,
      QUEUE_CONCURRENCY.payToByBlockchain,
      this.handlePayTo
    )
  }

  private updateTxAndBlockchainTxState = async (
    {
      txId,
      txState,
      txRemark,
    }: {
      txId: string
      txState: TRANSACTION_STATE
      txRemark?: TRANSACTION_REMARK
    },
    {
      blockchainTxId,
      blockchainTxState,
    }: {
      blockchainTxId: string
      blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE
    }
  ) => {
    const trx = await this.knex.transaction()
    try {
      await this.paymentService.markTransactionStateAs(
        {
          id: txId,
          state: txState,
          remark: txRemark,
        },
        trx
      )
      await this.paymentService.markBlockchainTransactionStateAs(
        {
          id: blockchainTxId,
          state: blockchainTxState,
        },
        trx
      )
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private failBothTxAndBlockchainTx = async (
    txId: string,
    blockchainTxId: string
  ) => {
    await this.updateTxAndBlockchainTxState(
      { txId, txState: TRANSACTION_STATE.failed },
      {
        blockchainTxId,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.reverted,
      }
    )
  }

  private timeoutBlockchainTx = async (blockchainTxId: string) => {
    await this.paymentService.markBlockchainTransactionStateAs({
      id: blockchainTxId,
      state: BLOCKCHAIN_TRANSACTION_STATE.timeout,
    })
  }

  private validateTxLogs = async (
    logs: Log[],
    {
      curatorAddress,
      creatorAddress,
      cid,
      tokenAddress,
      amount,
    }: {
      curatorAddress?: string
      creatorAddress?: string
      cid: string
      tokenAddress: string
      amount: string
    }
  ) => {
    const abi = [
      'event Curation(address indexed curator, address indexed creator, string indexed uri, IERC20 token, uint256 amount)',
    ]
    const topic =
      '0x962828029dfd82a5c84245e0610457c7f86f4f8a8551f344e06677e5a396a4a8'
    if (logs.length === 0) {
      return false
    } else {
      for (const log of logs) {
        if (
          log.address === environment.curationContractAddress &&
          log.topics[0] === topic
        ) {
          const iface = new ethers.utils.Interface(abi)
          const event = iface.parseLog(log)
          if (
            event.args[0].toLowerCase() === curatorAddress!.toLowerCase() &&
            event.args[1].toLowerCase() === creatorAddress!.toLowerCase() &&
            event.args[3].toLowerCase() === tokenAddress.toLowerCase() &&
            event.args[4] === ethers.BigNumber.from(amount)
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  /**
   * Pay-to handler.
   *
   */
  private handlePayTo: Queue.ProcessCallbackFunction<unknown> = async (job) => {
    const data = job.data as PaymentParams
    const txId = data.txId

    const tx = await this.paymentService.baseFindById(txId)
    if (!tx) {
      throw new PaymentQueueJobDataError('pay-to pending tx not found')
    }

    if (tx.provider !== PAYMENT_PROVIDER.blockchain) {
      throw new PaymentQueueJobDataError('wrong pay-to queue')
    }

    const blockchainTx =
      await this.paymentService.findBlockchainTransactionById(tx.providerTxId)

    if (!blockchainTx) {
      throw new PaymentQueueJobDataError('blockchain transaction not found')
    }

    const provider = getProvider()
    const confirms = 1

    let txReceipt
    try {
      txReceipt = await provider.waitForTransaction(
        blockchainTx.txHash,
        confirms,
        this.txTimeout
      )
    } catch (error) {
      if (error.code === ethers.utils.Logger.errors.TIMEOUT) {
        await this.timeoutBlockchainTx(blockchainTx.id)
        return data
      } else {
        throw error
      }
    }

    if (txReceipt.status === 0) {
      await this.failBothTxAndBlockchainTx(txId, blockchainTx.id)
      return data
    }
    const [recipient, sender, articleDb] = await Promise.all([
      this.userService.baseFindById(tx.recipientId),
      this.userService.baseFindById(tx.senderId),
      this.atomService.findFirst({
        table: 'article',
        where: { id: tx.targetId },
      }),
    ])

    const creatorAddress = recipient.ethAddress
    const curatorAddress = sender.ethAddress
    const cid = articleDb.dataHash
    const tokenAddress = USDTContractAddress
    const amount = tx.amount

    // txReceipt does not match with tx record in database
    if (
      !(await this.validateTxLogs(txReceipt.logs, {
        creatorAddress,
        curatorAddress,
        cid,
        tokenAddress,
        amount,
      }))
    ) {
      await this.updateTxAndBlockchainTxState(
        {
          txId,
          txState: TRANSACTION_STATE.canceled,
          txRemark: TRANSACTION_REMARK.INVALID,
        },
        {
          blockchainTxId: blockchainTx.id,
          blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
        }
      )
      return data
    }

    // update pending tx
    await this.updateTxAndBlockchainTxState(
      { txId, txState: TRANSACTION_STATE.succeeded },
      {
        blockchainTxId: blockchainTx.id,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
      }
    )

    // send email to sender
    const author = await this.atomService.findFirst({
      table: 'user',
      where: { id: articleDb.authorId },
    })
    const article = {
      id: tx.targetId,
      title: articleDb.title,
      slug: articleDb.slug,
      mediaHash: articleDb.mediaHash,
      author: {
        displayName: author.displayName,
        userName: author.userName,
      },
    }

    this.notificationService.mail.sendPayment({
      to: sender.email,
      recipient: {
        displayName: sender.displayName,
        userName: sender.userName,
      },
      type: 'donated',
      article,
      tx: {
        recipient,
        sender,
        amount: numRound(tx.amount),
        currency: tx.currency,
      },
    })

    // send email to recipient
    this.notificationService.trigger({
      event: DB_NOTICE_TYPE.payment_received_donation,
      actorId: sender.id,
      recipientId: recipient.id,
      entities: [{ type: 'target', entityTable: 'transaction', entity: tx }],
    })

    this.notificationService.mail.sendPayment({
      to: recipient.email,
      recipient: {
        displayName: recipient.displayName,
        userName: recipient.userName,
      },
      type: 'receivedDonation',
      tx: {
        recipient,
        sender,
        amount: numRound(tx.amount),
        currency: tx.currency,
      },
      article,
    })

    // manaully invalidate cache
    if (tx.targetType) {
      const entity = await this.userService.baseFindEntityTypeTable(
        tx.targetType
      )
      const entityType =
        NODE_TYPES[
          (_capitalize(entity?.table) as keyof typeof NODE_TYPES) || ''
        ]
      if (entityType && this.cacheService) {
        invalidateFQC({
          node: { type: entityType, id: tx.targetId },
          redis: this.cacheService.redis,
        })
      }
    }

    job.progress(100)
    return data
  }
}

export const payToByBlockchainQueue = new PayToByBlockchainQueue()
