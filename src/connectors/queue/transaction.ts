import Queue from 'bull'

import {
  HOUR,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  TRANSACTION_PURPOSE,
  TRANSACTION_REMARK,
  TRANSACTION_STATE,
} from 'common/enums'
import logger from 'common/logger'
import { PaymentService } from 'connectors'

import { BaseQueue } from './baseQueue'

class TxTimeoutQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>

  constructor() {
    super(QUEUE_NAME.txTimeout)
    this.paymentService = new PaymentService()
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    this.q.add(
      QUEUE_JOB.txTimeout,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 2.1, // every 2.1 hours
        },
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.txTimeout, this.handleUpdateTx())
  }

  private handleUpdateTx =
    (): Queue.ProcessCallbackFunction<unknown> => async (job, done) => {
      try {
        // cancel pending tx that are 30 minutes+ old
        logger.info(`[schedule job] canceling timeout pending transactions`)
        await this.paymentService
          .knex(this.paymentService.table)
          .update({
            state: TRANSACTION_STATE.canceled,
            remark: TRANSACTION_REMARK.TIME_OUT,
          })
          .where(
            'created_at',
            '<',
            this.paymentService.knex.raw(`now() - ('30 minutes'::interval)`)
          )
          .andWhere({ state: TRANSACTION_STATE.pending })
          .andWhereNot({
            purpose: TRANSACTION_PURPOSE.payout,
          })

        job.progress(100)
        done(null)
      } catch (e) {
        logger.error(
          `[schedule job] error in canceling timeout pending transactions}`
        )
        done(e)
      }
    }
}

export const txTimeoutQueue = new TxTimeoutQueue()
