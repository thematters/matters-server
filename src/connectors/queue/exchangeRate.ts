import Queue from 'bull'

import {
  DAY,
  MINUTE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
} from 'common/enums'
import { ExchangeRate } from 'connectors'
import SlackService from 'connectors/slack'

import { BaseQueue } from './baseQueue'

class ExchangeRateQueue extends BaseQueue {
  exchangeRate: InstanceType<typeof ExchangeRate>
  slackService: InstanceType<typeof SlackService>

  constructor() {
    super(QUEUE_NAME.exchangeRate)
    this.exchangeRate = new ExchangeRate()
    this.slackService = new SlackService()
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    this.q.add(
      QUEUE_JOB.updateFiat,
      {},
      {
        priority: QUEUE_PRIORITY.LOW,
        repeat: {
          every: DAY,
        },
      }
    )
    this.q.add(
      QUEUE_JOB.updateToken,
      {},
      {
        priority: QUEUE_PRIORITY.LOW,
        repeat: {
          every: MINUTE * 10,
        },
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.updateFiat, this.handleUpdateFiat)
    this.q.process(QUEUE_JOB.updateToken, this.handleUpdateToken)
  }

  private handleUpdateFiat: Queue.ProcessCallbackFunction<unknown> = async (
    job
  ) => {
    try {
      await this.exchangeRate.updateFiatRates()
    } catch (error) {
      this.slackService.sendQueueMessage({
        data: { error },
        title: `${QUEUE_NAME.exchangeRate}:${QUEUE_JOB.updateFiat}`,
        message: `'Failed to update fiat currencies exchanage rates`,
        state: SLACK_MESSAGE_STATE.failed,
      })
      throw error
    }
    job.progress(100)
  }

  private handleUpdateToken: Queue.ProcessCallbackFunction<unknown> = async (
    job
  ) => {
    try {
      await this.exchangeRate.updateTokenRates()
    } catch (error) {
      this.slackService.sendQueueMessage({
        data: { error },
        title: `${QUEUE_NAME.exchangeRate}:${QUEUE_JOB.updateToken}`,
        message: `'Failed to update crypto currencies exchanage rates`,
        state: SLACK_MESSAGE_STATE.failed,
      })
      throw error
    }
    job.progress(100)
  }
}

export const exchangeRateQueue = new ExchangeRateQueue()
