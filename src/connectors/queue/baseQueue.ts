import Queue from 'bull'
import { Knex } from 'knex'

import logger from 'common/logger'
import {
  ArticleService,
  AtomService,
  CacheService,
  DraftService,
  NotificationService,
  SystemService,
  TagService,
  UserService,
} from 'connectors'
import { knex } from 'connectors/db'

import { createQueue, CustomQueueOpts } from './utils'

export class BaseQueue {
  q: InstanceType<typeof Queue>

  userService: InstanceType<typeof UserService>
  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  tagService: InstanceType<typeof TagService>
  systemService: InstanceType<typeof SystemService>
  notificationService: InstanceType<typeof NotificationService>
  atomService: InstanceType<typeof AtomService>
  cacheService: InstanceType<typeof CacheService>
  knex: Knex

  constructor(queueName: string, customOpts?: CustomQueueOpts) {
    this.q = createQueue(queueName, customOpts)

    this.userService = new UserService()
    this.articleService = new ArticleService()
    this.draftService = new DraftService()
    this.tagService = new TagService()
    this.systemService = new SystemService()
    this.notificationService = new NotificationService()
    this.atomService = new AtomService()
    this.cacheService = new CacheService()

    this.knex = knex

    this.startScheduledJobs()
  }

  /**
   * Start scheduled jobs
   */
  startScheduledJobs = async () => {
    await this.clearDelayedJobs()
    await this.addRepeatJobs()
  }

  /**
   * Producers
   */
  clearDelayedJobs = async () => {
    this.q
      .on('error', (err) => {
        // An error occured.
        console.error('job error unhandled:', err)
      })
      .on('waiting', (jobId) => {
        // A Job is waiting to be processed as soon as a worker is idling.
      })
      .on('progress', (job, progress) => {
        // A job's progress was updated!
        console.log('job progress:', progress, job)
      })
      .on('failed', (job, err) => {
        // A job failed with reason `err`!
        console.error('job failed:', err, job)
      })
      .on('completed', (job, result) => {
        // A job successfully completed with a `result`.
        console.log('job completed:', result, job)
      })
      .on('removed', (job) => {
        // A job successfully removed.
        console.log('job removed:', job)
      })

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

  addRepeatJobs = async () => {
    // Implemented by instance
  }
}
