import { MailData } from '@sendgrid/helpers/classes/mail'
import Queue from 'bull'
import { v4 } from 'uuid'

import {
  EMAIL_TEMPLATE_ID,
  MIGRATION_DELAY,
  NODE_TYPES,
  OAUTH_PROVIDER,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY
} from 'common/enums'
import { environment, isTest } from 'common/environment'
import logger from 'common/logger'
import { makeSummary, sanitize } from 'common/utils'
import { i18n } from 'common/utils/i18n'
import {
  CacheService,
  DraftService,
  mailService,
  NotificationService,
  SystemService,
  UserService
} from 'connectors'

import { createQueue } from './utils'

class MigrationQueue {
  q: InstanceType<typeof Queue>
  cacheService: InstanceType<typeof CacheService>
  draftService: InstanceType<typeof DraftService>
  notificationService: InstanceType<typeof NotificationService>
  systemService: InstanceType<typeof SystemService>
  userService: InstanceType<typeof UserService>

  private queueName = QUEUE_NAME.migration

  constructor() {
    this.cacheService = new CacheService()
    this.draftService = new DraftService()
    this.notificationService = new NotificationService()
    this.systemService = new SystemService()
    this.userService = new UserService()
    this.q = createQueue(this.queueName)
    this.addConsumers()
  }

  /**
   * Producers
   */
  migrate = ({
    userId,
    provider,
    delay = MIGRATION_DELAY
  }: {
    userId: string
    provider: string
    delay?: number
  }) => {
    return this.q.add(
      QUEUE_JOB.migration,
      { userId, provider },
      {
        delay,
        priority: QUEUE_PRIORITY.NORMAL
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    if (isTest) {
      return
    }

    this.q.process(
      QUEUE_JOB.migration,
      QUEUE_CONCURRENCY.migration,
      async (job, done) => {
        try {
          const { userId, provider } = job.data as {
            userId: string
            provider: string
          }

          const user = await this.userService.baseFindById(userId)
          if (!user) {
            job.progress(100)
            done(new Error(`can not find user ${userId}`))
            return
          }

          // get and check oauth

          // put draft

          // put assets

          job.progress(90)

          // add email task
          this.notificationService.mail.sendMigrationSuccess({
            to: user.email,
            language: user.language,
            recipient: {
              displayName: user.displayName,
              userName: user.userName
            }
          })

          job.progress(100)
          done(null, 'Migration has finished.')
        } catch (error) {
          logger.error(error)
          done(error)
        }
      }
    )
  }
}

export const migrationQueue = new MigrationQueue()
