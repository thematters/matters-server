import Queue from 'bull'

import logger from 'common/logger'
import {
  ArticleService,
  CacheService,
  DraftService,
  NotificationService,
  SystemService,
  TagService,
  UserService,
} from 'connectors'

import { createQueue } from './utils'

export class BaseQueue {
  q: InstanceType<typeof Queue>

  userService: InstanceType<typeof UserService>
  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  tagService: InstanceType<typeof TagService>
  systemService: InstanceType<typeof SystemService>
  notificationService: InstanceType<typeof NotificationService>
  cacheService: InstanceType<typeof CacheService>

  constructor(queueName: string) {
    this.q = createQueue(queueName)

    this.userService = new UserService()
    this.articleService = new ArticleService()
    this.draftService = new DraftService()
    this.tagService = new TagService()
    this.systemService = new SystemService()
    this.notificationService = new NotificationService()
    this.cacheService = new CacheService()

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
