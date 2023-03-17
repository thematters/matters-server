import { makeSummary } from '@matters/ipns-site-generator'
import { normalizeArticleHTML, sanitizeHTML } from '@matters/matters-editor'
import { v4 } from 'uuid'

import {
  ASSET_TYPE,
  MIGRATION_DELAY,
  MIGTATION_SOURCE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { isTest } from 'common/environment'
import logger from 'common/logger'

import { BaseQueue } from './baseQueue'

class MigrationQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.migration)
    this.addConsumers()
  }

  /**
   * Producers
   */
  migrate = ({
    type,
    userId,
    htmls,
    delay = MIGRATION_DELAY,
  }: {
    type: string
    userId: string
    htmls: string[]
    delay?: number
  }) => {
    return this.q.add(
      QUEUE_JOB.migration,
      { type, userId, htmls },
      {
        delay,
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: true,
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
          const { type, userId, htmls } = job.data as {
            type: string
            userId: string
            htmls: string[]
          }

          const user = await this.userService.baseFindById(userId)
          if (!user) {
            job.progress(100)
            done(new Error(`can not find user ${userId}`))
            return
          }

          const { id: entityTypeId } =
            await this.systemService.baseFindEntityTypeId('draft')
          if (!entityTypeId) {
            job.progress(100)
            throw new Error('entity type is incorrect.')
            return
          }

          if (!htmls || htmls.length === 0) {
            job.progress(100)
            done(new Error(`html files are not provided`))
            return
          }

          switch (type) {
            case MIGTATION_SOURCE.medium:
              for (const html of htmls) {
                if (!html) {
                  continue
                }

                // process raw html
                const { title, content, assets } =
                  await this.userService.medium.convertRawHTML(html)

                // put draft
                const draft = await this.draftService.baseCreate({
                  authorId: userId,
                  uuid: v4(),
                  title,
                  summary: content && makeSummary(content),
                  content:
                    content &&
                    normalizeArticleHTML(await sanitizeHTML(content)),
                })

                // add asset and assetmap
                await Promise.all(
                  assets.map((asset) =>
                    this.systemService.createAssetAndAssetMap(
                      {
                        uuid: asset.uuid,
                        authorId: userId,
                        type: ASSET_TYPE.embed,
                        path: asset.key,
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
              userName: user.userName,
            },
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
