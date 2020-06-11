import Queue from 'bull'

import {
  NODE_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_MAXIMUM_AMOUNT,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  TRANSACTION_STATE,
} from 'common/enums'
import { PaymentQueueJobDataError } from 'common/errors'
import logger from 'common/logger'
import { numRound } from 'common/utils'
import { PaymentService } from 'connectors'

import { BaseQueue } from './baseQueue'

interface PaymentParams {
  txId: string
}

class PaymentQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>

  constructor() {
    super(QUEUE_NAME.payment)
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

  /**
   * Consumers. Process a job at a time, so concurrency set as 1.
   *
   * @see https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueprocess
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.payout, 1, this.handlePayout)
    this.q.process(QUEUE_JOB.payTo, 1, this.handlePayTo)
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
        this.paymentService.findPayoutAccount({ userId: tx.senderId }),
        this.paymentService.countPendingPayouts({ userId: tx.senderId }),
      ])
      const recipient = customer[0]

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

  private handlePayTo: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    let txId
    try {
      const data = job.data as PaymentParams
      txId = data.txId

      if (!txId) {
        throw new PaymentQueueJobDataError(
          `pay-to job has no required txId: ${txId}`
        )
      }
      const tx = await this.paymentService.baseFindById(txId)
      if (!tx) {
        throw new PaymentQueueJobDataError('pay-to pending tx not found')
      }

      // cancel pay-to if recipientId or senderId is not specified
      if (!tx.recipientId || !tx.senderId) {
        await this.cancelTx(txId)
        return done(null, job.data)
      }

      const [balance, hasPaid, recipient, sender] = await Promise.all([
        this.paymentService.calculateHKDBalance({ userId: tx.senderId }),
        this.paymentService.sumTodayDonationTransactions({
          senderId: tx.senderId,
        }),
        this.userService.baseFindById(tx.recipientId),
        this.userService.baseFindById(tx.senderId),
      ])

      // cancel pay-to if:
      // 1. balance including pending amounts < 0
      // 2. current tx amount reachs limit
      // 3. acculmated txs reachs daily limit
      // 4. recipient or sender not existed
      if (
        balance < 0 ||
        tx.amount > PAYMENT_MAXIMUM_AMOUNT.HKD ||
        tx.amount + hasPaid > PAYMENT_MAXIMUM_AMOUNT.HKD ||
        !recipient ||
        !sender
      ) {
        await this.cancelTx(txId)
        return done(null, job.data)
      }

      // update pending tx
      await this.paymentService.baseUpdate(tx.id, {
        state: TRANSACTION_STATE.succeeded,
        updatedAt: new Date(),
      })

      // send email to sender
      this.notificationService.mail.sendPayment({
        to: sender.email,
        recipient: {
          displayName: sender.displayName,
          userName: sender.userName,
        },
        type: 'donated',
        tx: {
          recipient,
          sender,
          amount: numRound(tx.amount),
          currency: tx.currency,
        },
      })

      // send email to recipient
      this.notificationService.trigger({
        event: 'payment_received_donation',
        actorId: sender.id,
        recipientId: recipient.id,
        entities: [
          {
            type: 'target',
            entityTable: 'transaction',
            entity: tx,
          },
        ],
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
      })

      // manaully invalidate cache
      if (tx.targetType) {
        const entity = await this.userService.baseFindEntityTypeTable(
          tx.targetType
        )
        const entityType =
          NODE_TYPES[(entity?.table as keyof typeof NODE_TYPES) || '']
        if (entityType) {
          await this.cacheService.invalidateFQC(entityType, tx.targetId)
        }
      }

      job.progress(100)
      done(null, job.data)
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

export const paymentQueue = new PaymentQueue()
