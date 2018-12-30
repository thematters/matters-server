import Queue from 'bull'

import { queueSharedOpts, PRIORITY, JOB } from './utils'

class ScheduleQueue {
  q: InstanceType<typeof Queue>

  private queueName = 'schedule_queue'

  constructor() {
    this.q = new Queue(this.queueName, queueSharedOpts)
    this.addConsumers()
    this.addRepeatJobs()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(JOB.publishPendingArticles, async (job, done) => {
      console.log('[Job:publishPendingArticles]', job.id)
      // TODO
      job.progress(100)
      done()
    })
    this.q.process(JOB.computeGravity, async (job, done) => {
      console.log('[Job:computeGravity]', job.id)
      // TODO
      job.progress(100)
      done()
    })
  }

  /**
   * Producers
   */
  addRepeatJobs = () => {
    this.q.add(JOB.publishPendingArticles, null, {
      priority: PRIORITY.HIGH,
      repeat: {
        every: 1000 * 60 * 20 // every 20 mins
      }
      // removeOnComplete: true
    })
    this.q.add(JOB.computeGravity, null, {
      priority: PRIORITY.NORMAL,
      repeat: {
        every: 1000 * 60 * 60 // every hour
      }
      // removeOnComplete: true
    })
  }
}

export const scheduleQueue = new ScheduleQueue()
