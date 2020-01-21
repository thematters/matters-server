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
          const tokenData = await this.userService.findOAuthToken({
            userId,
            provider
          })
          if (!tokenData || !tokenData.accessToken || !tokenData.refreshToken) {
            job.progress(100)
            done(new Error(`user ${userId} has no ${provider} OAuth token`))
            return
          }

          const { accessToken, refreshToken } = tokenData

          switch (provider) {
            case OAUTH_PROVIDER.medium:
              // get user info
              const userInfo = await this.userService.medium.getUserInfo({
                userId,
                accessToken,
                refreshToken
              })
              if (!userInfo.data || !userInfo.data.id) {
                job.progress(100)
                done(new Error(`user ${userId} ${provider} id is invalid`))
                return
              }

              // fetch postIds from Medium
              const postIds = await this.userService.medium.getUserPostIds({
                userId: userInfo.data.id
              })

              const {
                id: entityTypeId
              } = await this.systemService.baseFindEntityTypeId('draft')
              if (!entityTypeId) {
                throw new Error('Entity type is incorrect.')
              }

              // process all posts
              for (const postId of postIds) {
                const post = await this.userService.medium.getUserPostParagraphs(
                  { postId }
                )

                // generate html and extract images need to store in db
                const {
                  html,
                  assets
                } = await this.userService.medium.convertPostParagraphsToHTML(
                  post
                )

                // put draft
                const draft = await this.draftService.baseCreate({
                  authorId: userId,
                  uuid: v4(),
                  title: post.title,
                  summary: html && makeSummary(html),
                  content: html && sanitize(html)
                })

                // add asset and assetmap
                const result = await Promise.all(
                  assets.map(asset =>
                    this.systemService.createAssetAndAssetMap(
                      {
                        uuid: asset.uuid,
                        authorId: userId,
                        type: 'embed',
                        path: asset.key
                      },
                      entityTypeId,
                      draft.id
                    )
                  )
                )
              }
              break
          }
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
