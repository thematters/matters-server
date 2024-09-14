import type { CustomQueueOpts } from './utils'
import type { Queue, ProcessCallbackFunction } from 'bull'
import type {
  Connections,
} from 'definitions'

import {
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  MINUTE,
} from 'common/enums'
import { getLogger } from 'common/logger'
import {
  TagService,
  ArticleService,
  UserService,
  SystemService,
  NotificationService,
  AtomService,
  CampaignService,
} from 'connectors'

import { getOrCreateQueue } from './utils'
import { CheckDraftState } from './publication/checkDraftState'
import { CreateArticle } from './publication/createArticle'
import { HandleTag } from './publication/handleTag'
import { TagHandler } from './publication/tagHandler'
import { HandleCircle } from './publication/handleCircle'
import { CircleHandler } from './publication/circleHandler'
import { HandleCollection } from './publication/handleCollection'
import { ConnectionHandler } from './publication/connectionHandler'
import { HandleMention } from './publication/handleMention'
import { MentionHandler } from './publication/mentionHandler'
import { HandleCampaign } from './publication/handleCampaign'
import { CampaignHandler } from './publication/campaignHandler'
import { HandleAsset } from './publication/handleAsset'
import { Notify } from './publication/notify'
import { InvalidateUserCache } from './publication/invalidateUserCache'
import { PublishToInterPlanetarySystem } from './publication/publishToInterPlanetarySystem'
import { CompletePublication } from './publication/invalidateArticleCache'
import { chainJobs } from './publication/job'

const logger = getLogger('queue-publication')

export interface PublishArticleData {
  draftId: string
  iscnPublish?: boolean
}

export class PublicationQueue {
  private connections: Connections
  private q: Queue

  public constructor(connections: Connections, customOpts?: CustomQueueOpts) {
    this.connections = connections
    const [q, created] = getOrCreateQueue(QUEUE_NAME.publication, customOpts)
    this.q = q
    if (created) {
      this.addConsumers()
    }
  }

  public publishArticle = ({
    draftId,
    iscnPublish,
  }: PublishArticleData) =>
    this.q.add(
      QUEUE_JOB.publishArticle,
      { draftId, iscnPublish },
      {
        priority: QUEUE_PRIORITY.CRITICAL,
        jobId: `${QUEUE_JOB.publishArticle}:${draftId}`,
        // last attempt will be at 1 hour
        attempts: 7,
        backoff: {
          type: 'exponential',
          delay: MINUTE,
        },
      }
    )

  public refreshIPNSFeed = ({
    userName,
    numArticles = 50,
    forceReplace,
  }: {
    userName: string
    numArticles?: number
    forceReplace?: boolean
  }) =>
    this.q.add(QUEUE_JOB.refreshIPNSFeed, {
      userName,
      numArticles,
      forceReplace,
    })

  /**
   * Consumers
   */
  private addConsumers = () => {
    // publish article
    this.q.process(
      QUEUE_JOB.publishArticle,
      QUEUE_CONCURRENCY.publishArticle,
      this.handlePublishArticle
    )

    this.q.process(
      QUEUE_JOB.refreshIPNSFeed,
      QUEUE_CONCURRENCY.refreshIPNSFeed,
      this.handleRefreshIPNSFeed
    )
  }

  /**
   * Publish Article
   */
  private handlePublishArticle = chainJobs(() => {
    const articleService = new ArticleService(this.connections)
    const userService = new UserService(this.connections)
    const systemService = new SystemService(this.connections)
    const notificationService = new NotificationService(this.connections)
    const atomService = new AtomService(this.connections)
    const campaignService = new CampaignService(this.connections)

    const connectionHandler = new ConnectionHandler(atomService, articleService, notificationService, logger)
    const circleHandler = new CircleHandler(userService, atomService, notificationService, this.connections.redis)
    const tagHandler = new TagHandler(new TagService(this.connections))
    const mentionHandler = new MentionHandler(notificationService)
    const campaignHandler = new CampaignHandler(campaignService, this.connections.redis)

    return [
      new CheckDraftState(atomService),
      new CreateArticle(articleService, atomService),
      new HandleCollection(atomService, articleService, connectionHandler, logger),
      new HandleCircle(atomService, articleService, circleHandler, logger),
      new HandleTag(atomService, articleService, tagHandler, logger),
      new HandleMention(atomService, mentionHandler, logger),
      new HandleCampaign(atomService, campaignHandler, logger),
      new HandleAsset(atomService, systemService, logger),
      new Notify(notificationService, atomService),
      new InvalidateUserCache(atomService, this.connections.redis),
      new PublishToInterPlanetarySystem(atomService, articleService, userService, logger),
      new CompletePublication(atomService, articleService, this.connections.redis),
    ]
  })

  /**
   * Delete unused assets from S3 and DB, skip if error is thrown.
   */
  // TOFIX: `extractAssetDataFromHtml` and `systemService.deleteAssetAndAssetMap` are broken
  // private deleteUnusedAssets = async ({
  //   draftEntityTypeId,
  //   draft,
  // }: {
  //   draftEntityTypeId: string
  //   draft: Draft
  // }) => {
  //   const systemService = new SystemService(this.connections)
  //   try {
  //     const [assets, uuids] = await Promise.all([
  //       systemService.findAssetAndAssetMap({
  //         entityTypeId: draftEntityTypeId,
  //         entityId: draft.id,
  //       }),
  //       extractAssetDataFromHtml(draft.content),
  //     ])

  //     const unusedAssetPaths: { [id: string]: string } = {}
  //     assets.forEach((asset: any) => {
  //       const isCover = draft.cover === asset.assetId
  //       const isEmbed = uuids && uuids.includes(asset.uuid)

  //       if (!isCover && !isEmbed) {
  //         unusedAssetPaths[`${asset.assetId}`] = asset.path
  //       }
  //     })

  //     if (Object.keys(unusedAssetPaths).length > 0) {
  //       await systemService.deleteAssetAndAssetMap(unusedAssetPaths)
  //     }
  //   } catch (e) {
  //     logger.error(e)
  //   }
  // }

  private handleRefreshIPNSFeed: ProcessCallbackFunction<unknown> = async (
    job // use Promise based job processing instead of `done`
  ) => {
    const articleService = new ArticleService(this.connections)
    return articleService.publishFeedToIPNS(
      job.data as {
        userName: string
        numArticles: number
        forceReplace?: boolean
      }
    )
  }
}
