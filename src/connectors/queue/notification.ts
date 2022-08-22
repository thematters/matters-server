import { MailDataRequired } from '@sendgrid/helpers/classes/mail'
import Queue from 'bull'

import { QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'
import { mailService } from 'connectors'

import { createQueue } from './utils'

/**
 * Note:
 *
 * Since it's only used by NotificationService,
 * and easy to cause circular import issues,
 * NotificationQueue isn't inherit from BaseQueue,
 * and will not be exported at "index.ts".
 *
 */
class NotificationQueue {
  q: InstanceType<typeof Queue>

  constructor() {
    this.q = createQueue(QUEUE_NAME.notification)
    this.addConsumers()
  }

  /**
   * Producers
   */
  sendMail = (data: MailDataRequired) => {
    return this.q.add(QUEUE_JOB.sendMail, data, {
      priority: QUEUE_PRIORITY.NORMAL,
    })
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.sendMail, async (job, done) => {
      try {
        const result = await mailService.send(job.data as MailDataRequired)
        job.progress(100)
        done(null, result)
      } catch (e) {
        done(e)
      }
    })
  }
}

export const notificationQueue = new NotificationQueue()
