import Queue from 'bull'

import {
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  ARTICLE_STATE
} from 'common/enums'
import { UserService, SystemService, DraftService } from 'connectors'

import { createQueue } from './utils'
import logger from 'common/logger'

interface ArchiveUserData {
  userId: string
}

class UserQueue {
  q: InstanceType<typeof Queue>
  userService: InstanceType<typeof UserService>
  draftService: InstanceType<typeof DraftService>
  systemService: InstanceType<typeof SystemService>

  private queueName = QUEUE_NAME.user

  constructor() {
    this.userService = new UserService()
    this.draftService = new DraftService()
    this.systemService = new SystemService()
    this.q = createQueue(this.queueName)
    this.addConsumers()
  }

  /**
   * Producers
   */
  archiveUser = (data: ArchiveUserData) => {
    return this.q.add(QUEUE_JOB.archiveUser, data, {
      priority: QUEUE_PRIORITY.NORMAL,
      attempts: 1
    })
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.archiveUser, this.handleArchiveUser)
  }

  private handleArchiveUser: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      const { userId } = job.data as ArchiveUserData

      // delete unlinked drafts
      await this.deleteUnlinkedDrafts(userId)
      job.progress(30)

      // delete assets
      await this.deleteMiscAssets(userId)
      job.progress(70)

      // update search
      try {
        await this.userService.es.client.update({
          index: this.userService.table,
          id: userId,
          body: {
            doc: { state: ARTICLE_STATE.archived }
          }
        })
      } catch (e) {
        logger.error(e)
      }
      job.progress(100)

      done(null)
    } catch (e) {
      done(e)
    }
  }

  /**
   * Delete drafts that aren't linked to articles
   */
  private deleteUnlinkedDrafts = async (authorId: string) => {
    const drafts = await this.draftService.findUnlinkedDraftsByAuthor(authorId)
    const {
      id: draftEntityTypeId
    } = await this.systemService.baseFindEntityTypeId('draft')

    // delete assets
    await Promise.all(
      drafts.map(async draft => {
        const assetMap = await this.systemService.findAssetMap(
          draftEntityTypeId,
          draft.id
        )
        const assets = assetMap.reduce((data: any, asset: any) => {
          data[`${asset.assetId}`] = asset.path
          return data
        }, {})

        if (assets && Object.keys(assets).length > 0) {
          await this.systemService.deleteAssetAndAssetMap(Object.keys(assets))
          await Promise.all(
            Object.values(assets).map((key: any) => {
              this.systemService.aws.baseDeleteFile(key)
            })
          )
        }
      })
    )

    // delete drafts
    await this.draftService.baseBatchDelete(drafts.map(draft => draft.id))
  }

  /**
   * Delete miscellaneous assets:
   * - avatar
   * - profileCover
   * - oauthClientAvatar
   *
   */
  private deleteMiscAssets = async (userId: string) => {
    const types = ['avatar', 'profileCover', 'oauthClientAvatar']
    const assets = await this.systemService.findAssetsByAuthorAndTypes(
      userId,
      types
    )

    // delete from S3
    await Promise.all(
      assets.map(({ path }) => {
        this.systemService.aws.baseDeleteFile(path)
      })
    )

    // delete from DB
    await this.systemService.deleteAssetsByAuthorAndTypes(userId, types)
  }
}

export const userQueue = new UserQueue()
