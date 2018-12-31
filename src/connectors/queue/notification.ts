import Queue from 'bull'
import { MailData } from '@sendgrid/helpers/classes/mail'

import { mailService } from 'connectors/notificationService/mail'
import { pushService, PushParams } from 'connectors/notificationService/push'
import { queueSharedOpts, PRIORITY, JOB } from './utils'

class NotificationQueue {
  q: InstanceType<typeof Queue>

  private queueName = 'notification_queue'

  constructor() {
    this.q = new Queue(this.queueName, queueSharedOpts)
    this.addConsumers()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(JOB.sendMail, async (job, done) => {
      try {
        await mailService.send(job.data)
        job.progress(100)
        done()
      } catch (e) {
        done(e)
      }
    })
    this.q.process(JOB.pushNotification, async (job, done) => {
      try {
        await pushService.push(job.data)
        job.progress(100)
        done()
      } catch (e) {
        done(e)
      }
    })
  }

  /**
   * Producers
   */
  sendMail = (data: MailData) => {
    return this.q.add(JOB.sendMail, data, {
      priority: PRIORITY.NORMAL
      // removeOnComplete: true
    })
  }

  pushNotification = (data: PushParams) => {
    return this.q.add(JOB.pushNotification, data, {
      priority: PRIORITY.NORMAL
      // removeOnComplete: true
    })
  }
}

export const notificationQueue = new NotificationQueue()
