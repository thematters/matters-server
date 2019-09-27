// external
import Queue from 'bull'
import { MailData } from '@sendgrid/helpers/classes/mail'
// local
import { QUEUE_PRIORITY, QUEUE_JOB, QUEUE_NAME } from 'common/enums'
import { pushService, PushParams } from 'connectors/push'
import { mailService } from 'connectors/mail'

import { createQueue } from './utils'

class NotificationQueue {
  q: InstanceType<typeof Queue>

  private queueName = QUEUE_NAME.notification

  constructor() {
    this.q = createQueue(this.queueName)
    this.addConsumers()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.sendMail, async (job, done) => {
      try {
        const result = await mailService.send(job.data as MailData)
        job.progress(100)
        done(null, result)
      } catch (e) {
        done(e)
      }
    })
    this.q.process(QUEUE_JOB.pushNotification, async (job, done) => {
      try {
        const result = await pushService.push(job.data as PushParams)
        job.progress(100)
        done(null, result)
      } catch (e) {
        done(e)
      }
    })
  }

  /**
   * Producers
   */
  sendMail = (data: MailData) => {
    return this.q.add(QUEUE_JOB.sendMail, data, {
      priority: QUEUE_PRIORITY.NORMAL
    })
  }

  pushNotification = (data: PushParams) => {
    return this.q.add(QUEUE_JOB.pushNotification, data, {
      priority: QUEUE_PRIORITY.NORMAL
    })
  }
}

export const notificationQueue = new NotificationQueue()
