import type { Connections, EmailableUser } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'
import _capitalize from 'lodash/capitalize'

import {
  NODE_TYPES,
  PAYMENT_MAXIMUM_PAYTO_AMOUNT,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  TRANSACTION_STATE,
} from 'common/enums'
import { PaymentQueueJobDataError } from 'common/errors'
import { getLogger } from 'common/logger'
import { PaymentService, UserService, AtomService } from 'connectors'

import { BaseQueue } from '../baseQueue'

const logger = getLogger('queue-payto-by-matters')

interface PaymentParams {
  txId: string
}

export class PayToByMattersQueue extends BaseQueue {
  public constructor(connections: Connections) {
    super(QUEUE_NAME.payTo, connections)
    this.addConsumers()
  }

  /**
   * Producer for payTo.
   *
   */
  public payTo = ({ txId }: PaymentParams) =>
    this.q.add(
      QUEUE_JOB.payTo,
      { txId },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: false,
      }
    )

  /**
   * Consumers. Process a job at a time, so concurrency set as 1.
   *
   * @see https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueprocess
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.payTo, 1, this.handlePayTo)
  }

  /**
   * Wrapper of db service function makes transaction canceled.
   *
   */
  private cancelTx = async (txId: string, paymentService: PaymentService) =>
    paymentService.markTransactionStateAs({
      id: txId,
      state: TRANSACTION_STATE.canceled,
    })

  /**
   * Wrapper of db service function makes transaction failed.
   *
   */
  private failTx = async (txId: string, paymentService: PaymentService) =>
    paymentService.markTransactionStateAs({
      id: txId,
      state: TRANSACTION_STATE.failed,
    })

  /**
   * Pay-to handler.
   *
   */
  private handlePayTo: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const paymentService = new PaymentService(this.connections)
    const userService = new UserService(this.connections)
    const atomService = new AtomService(this.connections)

    let txId
    try {
      const data = job.data as PaymentParams
      txId = data.txId

      if (!txId) {
        throw new PaymentQueueJobDataError(
          `pay-to job has no required txId: ${txId}`
        )
      }
      const tx = await paymentService.baseFindById(txId)
      if (!tx) {
        throw new PaymentQueueJobDataError('pay-to pending tx not found')
      }

      // cancel pay-to if recipientId or senderId is not specified
      if (!tx.recipientId || !tx.senderId) {
        await this.cancelTx(txId, paymentService)
        return done(null, job.data)
      }

      const [balance, hasPaid, recipient, sender] = await Promise.all([
        paymentService.calculateHKDBalance({ userId: tx.senderId }),
        paymentService.sumTodayDonationTransactions({
          senderId: tx.senderId,
        }),
        userService.baseFindById(tx.recipientId),
        userService.baseFindById(tx.senderId),
      ])

      // cancel pay-to if:
      // 1. balance including pending amounts < 0
      // 2. current tx amount reachs limit
      // 3. acculmated txs reachs daily limit
      // 4. recipient or sender not existed
      if (
        balance < 0 ||
        parseFloat(tx.amount) > PAYMENT_MAXIMUM_PAYTO_AMOUNT.HKD ||
        parseFloat(tx.amount) + hasPaid > PAYMENT_MAXIMUM_PAYTO_AMOUNT.HKD ||
        !recipient ||
        !sender
      ) {
        await this.cancelTx(txId, paymentService)
        return done(null, job.data)
      }

      // update pending tx
      await paymentService.baseUpdate(tx.id, {
        state: TRANSACTION_STATE.succeeded,
        updatedAt: new Date(),
      })
      const article = await atomService.findFirst({
        table: 'article',
        where: { id: tx.targetId },
      })

      // notification
      await paymentService.notifyDonation({
        tx,
        sender: sender as EmailableUser,
        recipient: recipient as EmailableUser,
        article,
      })

      // manaully invalidate cache
      if (tx.targetType) {
        const entity = await userService.baseFindEntityTypeTable(tx.targetType)
        const entityType =
          NODE_TYPES[
            (_capitalize(entity?.table) as keyof typeof NODE_TYPES) || ''
          ]
        if (entityType) {
          invalidateFQC({
            node: { type: entityType, id: tx.targetId },
            redis: this.connections.redis,
          })
        }
      }

      job.progress(100)
      done(null, job.data)
    } catch (err: any) {
      if (txId && err.name !== 'PaymentQueueJobDataError') {
        try {
          await this.failTx(txId, paymentService)
        } catch (error) {
          logger.error(error)
        }
      }
      logger.error(err)
      done(err)
    }
  }
}
