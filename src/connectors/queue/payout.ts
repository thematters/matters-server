import type { Queue, ProcessCallbackFunction } from 'bull'
import type { Connections } from 'definitions'

import {
  PAYMENT_CURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
  TRANSACTION_STATE,
} from 'common/enums'
import { PaymentQueueJobDataError } from 'common/errors'
import { getLogger } from 'common/logger'
import { numMinus, numRound, numTimes } from 'common/utils'
import {
  AtomService,
  ExchangeRate,
  PaymentService,
  NotificationService,
} from 'connectors'
import SlackService from 'connectors/slack'

import { getOrCreateQueue } from './utils'

const logger = getLogger('queue-payout')

interface PaymentParams {
  txId: string
}

export class PayoutQueue {
  private connections: Connections
  private q: Queue
  public constructor(connections: Connections) {
    this.connections = connections
    const [q, created] = getOrCreateQueue(QUEUE_NAME.payout)
    this.q = q
    if (created) {
      this.addConsumers()
    }
  }

  /**
   * Producer for payout.
   *
   */
  public payout = ({ txId }: PaymentParams) =>
    this.q.add(
      QUEUE_JOB.payout,
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
    this.q.process(QUEUE_JOB.payout, 1, this.handlePayout)
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
   * Payout handler.
   *
   */
  private handlePayout: ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const slack = new SlackService()
    const atomService = new AtomService(this.connections)
    const paymentService = new PaymentService(this.connections)
    const notificationService = new NotificationService(this.connections)

    const data = job.data as PaymentParams

    let txId
    try {
      txId = data.txId

      if (!txId) {
        throw new PaymentQueueJobDataError(
          `payout job has no required txId: ${txId}`
        )
      }
      const tx = await paymentService.baseFindById(txId)
      if (!tx) {
        throw new PaymentQueueJobDataError('payout pending tx not found')
      }

      // cancel payout if senderId is not specified
      if (!tx.senderId) {
        await this.cancelTx(txId, paymentService)
        return done(null, job.data)
      }

      const [balance, payoutAccount, pending] = await Promise.all([
        paymentService.calculateHKDBalance({ userId: tx.senderId }),
        atomService.findFirst({
          table: 'payout_account',
          where: {
            userId: tx.senderId,
            capabilitiesTransfers: true,
            archived: false,
          },
        }),
        paymentService.countPendingPayouts({ userId: tx.senderId }),
      ])
      const recipient = payoutAccount

      // cancel payout if:
      // 1. balance including pending amounts < 0
      // 2. user has no stripe account
      // 3. user has multiple pending payouts
      if (balance < 0 || !recipient || !recipient.accountId || pending > 1) {
        await this.cancelTx(txId, paymentService)
        return done(null, job.data)
      }

      // only support HKD
      if (tx.currency !== PAYMENT_CURRENCY.HKD) {
        await this.cancelTx(txId, paymentService)
        return done(null, job.data)
      }

      // transfer to recipient's account in USD
      let HKDtoUSD: number
      const exchangeRate = new ExchangeRate(this.connections.redis)
      try {
        HKDtoUSD = (await exchangeRate.getRate('HKD', 'USD')).rate
      } catch (err: unknown) {
        if (err instanceof Error) {
          slack.sendStripeAlert({
            data,
            message: err?.message || 'failed to get currency rate.',
          })
        }
        throw err
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
      const transfer = await paymentService.stripe.transfer({
        amount: adjustedNetInUSD,
        currency: PAYMENT_CURRENCY.USD,
        recipientStripeConnectedId: recipient.accountId,
        txId,
      })

      if (!transfer || !transfer.id) {
        await this.failTx(txId, paymentService)
        return done(null, job.data)
      }

      // update tx
      await paymentService.baseUpdate(tx.id, {
        state: TRANSACTION_STATE.succeeded,
        providerTxId: transfer.id,
        updatedAt: new Date(),
      })

      // notifications
      const user = await atomService.userIdLoader.load(tx.senderId)

      if (user.email && user.userName && user.displayName) {
        notificationService.mail.sendPayment({
          to: user.email,
          recipient: {
            displayName: user.displayName,
            userName: user.userName,
          },
          type: 'payout',
          tx: {
            amount: net,
            currency: tx.currency,
          },
          language: user.language,
        })
      }

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
        userName: user.userName || '',
      })

      job.progress(100)
      done(null, { txId, stripeTxId: transfer.id })
    } catch (err: unknown) {
      if (err instanceof Error) {
        slack.sendStripeAlert({
          data,
          message: `failed to payout: ${data.txId}.`,
        })

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
}
