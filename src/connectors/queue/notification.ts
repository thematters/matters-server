// external
import Queue from 'bull'
import { MailData } from '@sendgrid/helpers/classes/mail'
// internal
import { QUEUE_PRIORITY, QUEUE_JOB, QUEUE_NAME } from 'common/enums'
import mailService from 'connectors/mail'
import pushService, { PushParams } from 'connectors/push'
// local
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
        const result = await mailService.send(job.data)
        job.progress(100)
        done(null, result)
      } catch (e) {
        done(e)
      }
    })
    this.q.process(QUEUE_JOB.pushNotification, async (job, done) => {
      try {
        const result = await pushService.push(job.data)
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
      // removeOnComplete: true
    })
  }

  pushNotification = (data: PushParams) => {
    return this.q.add(QUEUE_JOB.pushNotification, data, {
      priority: QUEUE_PRIORITY.NORMAL
      // removeOnComplete: true
    })
  }
}

export default new NotificationQueue()
