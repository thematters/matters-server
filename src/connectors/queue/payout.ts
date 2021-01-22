import Queue from 'bull'

import {
  PAYMENT_CURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  TRANSACTION_STATE,
} from 'common/enums'
import { PaymentQueueJobDataError } from 'common/errors'
import logger from 'common/logger'
import { numRound } from 'common/utils'
import { AtomService, PaymentService } from 'connectors'

import { BaseQueue } from './baseQueue'

interface PaymentParams {
  txId: string
}

class PayoutQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>

  constructor() {
    super(QUEUE_NAME.payout)
    this.atomService = new AtomService()
    this.paymentService = new PaymentService()
    this.addConsumers()
  }

  /**
   * Producer for payout.
   *
   */
  payout = ({ txId }: PaymentParams) => {
    return this.q.add(
      QUEUE_JOB.payout,
      { txId },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: false,
      }
    )
  }

  /**
   * Consumers. Process a job at a time, so concurrency set as 1.
   *
   * @see https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueprocess
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.payout, 1, this.handlePayout)
  }

  /**
   * Wrapper of db service function makes transaction canceled.
   *
   */
  private cancelTx = async (txId: string) =>
    this.paymentService.markTransactionStateAs({
      id: txId,
      state: TRANSACTION_STATE.canceled,
    })

  /**
   * Wrapper of db service function makes transaction failed.
   *
   */
  private failTx = async (txId: string) =>
    this.paymentService.markTransactionStateAs({
      id: txId,
      state: TRANSACTION_STATE.failed,
    })

  /**
   * Payout handler.
   *
   */
  private handlePayout: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    let txId
    try {
      const data = job.data as PaymentParams
      txId = data.txId

      if (!txId) {
        throw new PaymentQueueJobDataError(
          `payout job has no required txId: ${txId}`
        )
      }
      const tx = await this.paymentService.baseFindById(txId)
      if (!tx) {
        throw new PaymentQueueJobDataError('payout pending tx not found')
      }

      // cancel payout if senderId is not specified
      if (!tx.senderId) {
        await this.cancelTx(txId)
        return done(null, job.data)
      }

      const [balance, customer, pending] = await Promise.all([
        this.paymentService.calculateHKDBalance({ userId: tx.senderId }),
        this.atomService.findFirst({
          table: 'payout_account',
          where: { userId: tx.senderId, archived: false },
        }),
        this.paymentService.countPendingPayouts({ userId: tx.senderId }),
      ])
      const recipient = customer

      // cancel payout if:
      // 1. balance including pending amounts < 0
      // 2. user has no stripe account
      // 3. user has multiple pending payouts
      if (balance < 0 || !recipient || !recipient.accountId || pending > 1) {
        await this.cancelTx(txId)
        return done(null, job.data)
      }

      // create stripe payment
      const payment = await this.paymentService.stripe.createDestinationCharge({
        amount: numRound(tx.amount),
        currency: PAYMENT_CURRENCY.HKD,
        fee: numRound(tx.fee),
        recipientStripeConnectedId: recipient.accountId,
      })

      if (!payment || !payment.id) {
        await this.failTx(txId)
        return done(null, job.data)
      }

      // update pending tx
      await this.paymentService.baseUpdate(tx.id, {
        provider_tx_id: payment.id,
        updatedAt: new Date(),
      })

      job.progress(100)
      done(null, { txId, stripeTxId: payment.id })
    } catch (error) {
      if (txId && error.name !== 'PaymentQueueJobDataError') {
        try {
          await this.failTx(txId)
        } catch (error) {
          logger.error(error)
        }
      }
      logger.error(error)
      done(error)
    }
  }
}

export const payoutQueue = new PayoutQueue()
