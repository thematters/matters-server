import type { Connections } from 'definitions'

import { makeSummary } from '@matters/ipns-site-generator'
import {
  normalizeArticleHTML,
  sanitizeHTML,
} from '@matters/matters-editor/transformers'

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
import { getLogger } from 'common/logger'
import {
  UserService,
  NotificationService,
  SystemService,
  DraftService,
} from 'connectors'
import { medium } from 'connectors/medium'
import { UserHasUsername } from 'definitions'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-migration')

export class MigrationQueue extends BaseQueue {
  public constructor(connections: Connections) {
    super(QUEUE_NAME.migration, connections)
    this.addConsumers()
  }

  /**
   * Producers
   */
  public migrate = ({
    type,
    userId,
    htmls,
    delay = MIGRATION_DELAY,
  }: {
    type: string
    userId: string
    htmls: string[]
    delay?: number
  }) =>
    this.q.add(
      QUEUE_JOB.migration,
      { type, userId, htmls },
      {
        delay,
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: true,
      }
    )

  /**
   * Cusumers
   */
  private addConsumers = () => {
    if (isTest) {
      return
    }
    const draftService = new DraftService(this.connections)
    const userService = new UserService(this.connections)
    const systemService = new SystemService(this.connections)
    const notificationService = new NotificationService(this.connections)

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

          const user = (await userService.baseFindById(
            userId
          )) as UserHasUsername
          if (!user) {
            job.progress(100)
            done(new Error(`can not find user ${userId}`))
            return
          }

          const { id: entityTypeId } = await systemService.baseFindEntityTypeId(
            'draft'
          )
          if (!entityTypeId) {
            job.progress(100)
            throw new Error('entity type is incorrect.')
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
                const { title, content, assets } = await medium.convertRawHTML(
                  html
                )

                // put draft
                const draft = await draftService.baseCreate({
                  authorId: userId,
                  title,
                  summary: content && makeSummary(content),
                  content:
                    content &&
                    normalizeArticleHTML(
                      sanitizeHTML(content, { maxEmptyParagraphs: -1 })
                    ),
                })

                // add asset and assetmap
                await Promise.all(
                  assets.map((asset) =>
                    systemService.createAssetAndAssetMap(
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
          if (user.email) {
            notificationService.mail.sendMigrationSuccess({
              to: user.email,
              language: user.language,
              recipient: {
                displayName: user.displayName,
                userName: user.userName,
              },
            })
          }

          job.progress(100)
          done(null, 'Migration has finished.')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          logger.error(err)
          done(err)
        }
      }
    )
  }
}
