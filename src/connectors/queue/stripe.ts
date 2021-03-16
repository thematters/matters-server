import Queue from 'bull'

import { HOUR, QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'
import logger from 'common/logger'
import { PaymentService } from 'connectors'
import SlackService from 'connectors/slack'

import { BaseQueue } from './baseQueue'

class StripeQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>
  slackService: InstanceType<typeof SlackService>

  constructor() {
    super(QUEUE_NAME.stripe)
    this.paymentService = new PaymentService()
    this.slackService = new SlackService()
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    // daily sync delivery failed event every 3 hours
    this.q.add(
      QUEUE_JOB.syncDeliveryFailedEvents,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { every: HOUR * 3 },
      }
    )
  }

  /**
   * Consumers
   */
  private addConsumers = () => {
    this.q.process(
      QUEUE_JOB.syncDeliveryFailedEvents,
      this.syncDeliveryFailedEvents
    )
  }

  private syncDeliveryFailedEvents: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    try {
      logger.info('[schedule job] sync delivery failed events')

      // query recent delivery failed events
      const result = await this.paymentService.stripe.getDeliveryFailedEvents()
      job.progress(30)

      if (result && result.length > 0) {
        // send message to Slack
        result.map(async (event) => {
          this.slackService.sendStripeAlert({
            data: {
              id: event.id,
              type: event.type,
              pending_webhooks: event.pending_webhooks,
            },
            message: 'Delivery failed event',
          })
        })
      }

      job.progress(100)
      done(null, 'Syncing completed')
    } catch (error) {
      done(error)
    }
  }
}

export const stripeQueue = new StripeQueue()
