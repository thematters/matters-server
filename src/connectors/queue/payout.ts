import Queue from 'bull'

import {
  PAYMENT_CURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
  TRANSACTION_STATE,
} from 'common/enums/index.js'
import { PaymentQueueJobDataError } from 'common/errors.js'
import logger from 'common/logger.js'
import { numMinus, numRound, numTimes } from 'common/utils/index.js'
import { AtomService, ExchangeRate, PaymentService } from 'connectors/index.js'
import SlackService from 'connectors/slack/index.js'

import { BaseQueue } from './baseQueue.js'

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

      // only support HKD
      if (tx.currency !== PAYMENT_CURRENCY.HKD) {
        await this.cancelTx(txId)
        return done(null, job.data)
      }

      // transfer to recipient's account in USD
      let HKDtoUSD: number
      const exchangeRate = new ExchangeRate()
      try {
        HKDtoUSD = (await exchangeRate.getRate('HKD', 'USD')).rate
      } catch (error) {
        slack.sendStripeAlert({
          data,
          message: error?.message || 'failed to get currency rate.',
        })

        throw error
      }

      const amount = numRound(tx.amount)
      const amountInUSD = numRound(numTimes(amount, HKDtoUSD))
      const fee = numRound(tx.fee)
      const feeInUSD = numRound(numTimes(fee, HKDtoUSD))
      const net = numRound(numMinus(amount, fee))
      const netInUSD = numRound(numMinus(amountInUSD, feeInUSD))

      // plus additional 1% fee to amount if the recipient currency isn't USD
      // @see {@url https://github.com/thematters/matters-server/issues/2029}
      const canRecipientReceiveUSD =
        (recipient.currency as string).toLowerCase() === 'usd'
      const adjustedNetInUSD = canRecipientReceiveUSD
        ? netInUSD
        : numRound((netInUSD * 100) / 99)

      // start transfer
      const transfer = await this.paymentService.stripe.transfer({
        amount: adjustedNetInUSD,
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

      // notifications
      const user = await this.atomService.findFirst({
        table: 'user',
        where: { id: tx.senderId },
      })

      this.notificationService.mail.sendPayment({
        to: user.email,
        recipient: {
          displayName: user.displayName,
          userName: user.userName,
        },
        type: 'payout',
        tx: {
          recipient,
          amount: net,
          currency: tx.currency,
        },
        language: user.language,
      })

      slack.sendPayoutMessage({
        amount,
        amountInUSD,
        fee,
        feeInUSD,
        net,
        netInUSD,
        currency: tx.currency,
        state: SLACK_MESSAGE_STATE.successful,
        txId: tx.providerTxId,
        userName: user.userName,
      })

      job.progress(100)
      done(null, { txId, stripeTxId: transfer.id })
    } catch (error) {
      slack.sendStripeAlert({
        data,
        message: `failed to payout: ${data.txId}.`,
      })

      logger.error(error)

      if (txId && error.name !== 'PaymentQueueJobDataError') {
        try {
          await this.failTx(txId)
        } catch (error) {
          logger.error(error)
        }
      }

      done(error)
    }
  }
}

export const payoutQueue = new PayoutQueue()
