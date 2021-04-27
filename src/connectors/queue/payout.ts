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
import { numDivide, numRound } from 'common/utils'
import { AtomService, PaymentService } from 'connectors'
import SlackService from 'connectors/slack'

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
    const slack = new SlackService()
    const data = job.data as PaymentParams

    let txId
    try {
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

      const [balance, payoutAccount, pending] = await Promise.all([
        this.paymentService.calculateHKDBalance({ userId: tx.senderId }),
        this.atomService.findFirst({
          table: 'payout_account',
          where: {
            userId: tx.senderId,
            capabilitiesTransfers: true,
            archived: false,
          },
        }),
        this.paymentService.countPendingPayouts({ userId: tx.senderId }),
      ])
      const recipient = payoutAccount

      // cancel payout if:
      // 1. balance including pending amounts < 0
      // 2. user has no stripe account
      // 3. user has multiple pending payouts
      if (balance < 0 || !recipient || !recipient.accountId || pending > 1) {
        await this.cancelTx(txId)
        return done(null, job.data)
      }

      // transfer to recipient's account in USD
      let HKDtoUSD: number
      try {
        HKDtoUSD = await this.paymentService.getUSDtoHKDRate()
      } catch (error) {
        slack.sendStripeAlert({
          data,
          message: 'failed to get currency rate.',
        })
        throw error
      }

      const transfer = await this.paymentService.stripe.transfer({
        amount: numRound(numDivide(tx.amount, HKDtoUSD)),
        fee: numRound(numDivide(tx.fee, HKDtoUSD)),
        currency: PAYMENT_CURRENCY.USD,
        recipientStripeConnectedId: recipient.accountId,
        txId,
      })

      if (!transfer || !transfer.id) {
        await this.failTx(txId)
        return done(null, job.data)
      }

      // update tx
      await this.paymentService.baseUpdate(tx.id, {
        state: TRANSACTION_STATE.succeeded,
        provider_tx_id: transfer.id,
        updatedAt: new Date(),
      })

      job.progress(100)
      done(null, { txId, stripeTxId: transfer.id })
    } catch (error) {
      slack.sendStripeAlert({
        data,
        message: `failed to payout: ${data.txId}.`,
      })

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
