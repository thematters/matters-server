import type { Connections } from 'definitions'

import Queue from 'bull'

import { isTest } from 'common/environment'
import { getLogger } from 'common/logger'

import { getOrCreateQueue, type CustomQueueOpts } from './utils'

const logger = getLogger('queue-base')

export class BaseQueue {
  protected q: InstanceType<typeof Queue>
  protected connections: Connections

  public constructor(
    queueName: string,
    connections: Connections,
    customOpts?: CustomQueueOpts
  ) {
    const [q, created] = getOrCreateQueue(queueName, customOpts)
    this.q = q
    if (created) {
      this.addConsumers()
      logger.info(`queue ${queueName} created`)
    }
    this.connections = connections
    this.startScheduledJobs()
  }

  /**
   * Start scheduled jobs
   */
  private startScheduledJobs = async () => {
    await this.clearDelayedJobs()
    if (!isTest) {
      await this.addRepeatJobs()
    }
  }

  /**
   * Producers
   */
  private clearDelayedJobs = async () => {
    try {
      const jobs = await this.q.getDelayed()
      jobs.forEach(async (job) => {
        try {
          await job.remove()
        } catch (e) {
          logger.error('failed to clear repeat jobs', e)
        }
      })
    } catch (e) {
      logger.error('failed to clear repeat jobs', e)
    }
  }

  protected addConsumers = () => {
    // Implemented by subclass
  }

  protected addRepeatJobs = async () => {
    // Implemented by subclass
  }
}
