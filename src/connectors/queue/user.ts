import Queue from 'bull'

import { QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'
import { DraftService, SystemService, UserService } from 'connectors'

import { createQueue } from './utils'

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
      job.progress(50)

      // delete assets
      await this.deleteUserAssets(userId)
      job.progress(100)

      done(null, { userId })
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
          await this.systemService.deleteAssetAndAssetMap(assets)
        }
      })
    )

    // delete drafts
    await this.draftService.baseBatchDelete(drafts.map(draft => draft.id))
  }

  /**
   * Delete user assets:
   * - avatar
   * - profileCover
   * - oauthClientAvatar
   *
   */
  private deleteUserAssets = async (userId: string) => {
    const types = ['avatar', 'profileCover', 'oauthClientAvatar']
    const assets = (
      await this.systemService.findAssetsByAuthorAndTypes(userId, types)
    ).reduce((data: any, asset: any) => {
      data[`${asset.id}`] = asset.path
      return data
    }, {})

    if (assets && Object.keys(assets).length > 0) {
      await this.systemService.deleteAssetAndAssetMap(assets)
    }
  }
}

export const userQueue = new UserQueue()
