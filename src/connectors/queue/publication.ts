import type {
  Connections,
  Article,
  ArticleVersion,
  ArticleConnection,
} from '#definitions/index.js'
import type { CustomQueueOpts } from './utils.js'
import type { Queue, ProcessCallbackFunction } from 'bull'

import {
  NOTICE_TYPE,
  NODE_TYPES,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  METRICS_NAMES,
  MINUTE,
} from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import { normalizeTagInput, extractMentionIds } from '#common/utils/index.js'
import {
  TagService,
  ArticleService,
  UserService,
  SystemService,
  NotificationService,
  AtomService,
  CampaignService,
  aws,
} from '#connectors/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

import { getOrCreateQueue } from './utils.js'

const logger = getLogger('queue-publication')

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
  }: {
    draftId: string
    iscnPublish?: boolean
  }) =>
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
  }

  /**
   * Publish Article
   */
  private handlePublishArticle: ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const articleService = new ArticleService(this.connections)
    const systemService = new SystemService(this.connections)
    const notificationService = new NotificationService(this.connections)
    const atomService = new AtomService(this.connections)

    const { draftId, iscnPublish } = job.data as {
      draftId: string
      iscnPublish?: boolean
    }
    const draft = await atomService.findUnique({
      table: 'draft',
      where: { id: draftId },
    })

    // Step 1: checks
    if (!draft || draft.publishState !== PUBLISH_STATE.pending) {
      await job.progress(100)
      done(null, `Draft ${draftId} isn't in pending state.`)
      return
    }
    await job.progress(5)

    // Step 2: create an article
    const [article, articleVersion] = await articleService.createArticle(draft)

    await job.progress(20)

    await atomService.update({
      table: 'draft',
      where: { id: draft.id },
      data: {
        publishState: PUBLISH_STATE.published,
        articleId: article.id,
      },
    })

    await job.progress(30)

    // Note: the following steps won't affect the publication.
    try {
      // Step 4: handle collection, circles, tags & mentions
      await this.handleConnections(article, articleVersion)
      await job.progress(40)

      await this.handleCircle({
        article,
        articleVersion,
        // secret: key // TO update secret in 'article_circle' later after IPFS published
      })
      await job.progress(45)

      await this.handleTags({ article, articleVersion })
      await job.progress(50)

      await this.handleMentions({ article, content: draft.content })
      await job.progress(60)

      if (draft.campaigns && draft.campaigns.length > 0) {
        await this.handleCampaigns({ article, campaigns: draft.campaigns })
      }

      /**
       * Step 5: Handle Assets
       *
       * Relationship between asset_map and entity:
       *
       * cover -> article
       * embed -> draft
       *
       * @see {@url https://github.com/thematters/matters-server/pull/1510}
       */
      const [{ id: draftEntityTypeId }, { id: articleEntityTypeId }] =
        await Promise.all([
          systemService.baseFindEntityTypeId('draft'),
          systemService.baseFindEntityTypeId('article'),
        ])

      // Remove unused assets
      // await this.deleteUnusedAssets({ draftEntityTypeId, draft })
      await job.progress(70)

      // Swap cover assets from draft to article
      const coverAssets = await systemService.findAssetAndAssetMap({
        entityTypeId: draftEntityTypeId,
        entityId: draft.id,
        assetType: 'cover',
      })
      await systemService.swapAssetMapEntity(
        coverAssets.map((ast: { id: string }) => ast.id),
        articleEntityTypeId,
        article.id
      )
      await job.progress(75)
    } catch (err) {
      // ignore errors caused by these steps
      logger.warn('optional step failed: %j', {
        err,
        draftId: draft.id,
        jobId: job.id,
      })
    }

    // Step 7: trigger notifications
    notificationService.trigger({
      event: NOTICE_TYPE.article_published,
      recipientId: article.authorId,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })

    // Step 8: invalidate cache
    invalidateFQC({
      node: { type: NODE_TYPES.User, id: article.authorId },
      redis: this.connections.redis,
    })
    invalidateFQC({
      node: { type: NODE_TYPES.Article, id: article.id },
      redis: this.connections.redis,
    })

    await job.progress(100)

    // no await to put data async
    aws.putMetricData({
      MetricData: [
        {
          MetricName: METRICS_NAMES.ArticlePublishCount,
          // Counts: [1],
          Timestamp: new Date(),
          Unit: 'Count',
          Value: 1,
        },
      ],
    })

    done(null, {
      articleId: article.id,
      draftId: draft.id,
      iscnPublish: iscnPublish || draft.iscnPublish,
    })
  }

  private handleConnections = async (
    article: Article,
    articleVersion: ArticleVersion
  ) => {
    if (articleVersion.connections.length <= 0) {
      return
    }

    const articleService = new ArticleService(this.connections)
    const atomService = new AtomService(this.connections)
    const notificationService = new NotificationService(this.connections)

    const items = articleVersion.connections.map(
      (articleId: string, index: number) => ({
        entranceId: article.id,
        articleId,
        order: index,
      })
    )
    await articleService.baseBatchCreate<ArticleConnection>(
      items,
      'article_connection'
    )

    // trigger notifications
    articleVersion.connections.forEach(async (id: string) => {
      const connection = await atomService.findUnique({
        table: 'article',
        where: { id },
      })
      if (!connection) {
        logger.warn(`article connection not found: ${id}`)
        return
      }
      notificationService.trigger({
        event: NOTICE_TYPE.article_new_collected,
        recipientId: connection.authorId,
        actorId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'article', entity: connection },
          {
            // TODO: rename to 'connection' and migrate notice_entity table
            type: 'collection',
            entityTable: 'article',
            entity: article,
          },
        ],
      })
    })
  }

  private handleCircle = async ({
    article,
    articleVersion,
    secret,
  }: {
    article: Article
    articleVersion: ArticleVersion
    secret?: string
  }) => {
    if (!articleVersion.circleId) {
      return
    }

    const userService = new UserService(this.connections)
    const atomService = new AtomService(this.connections)
    const notificationService = new NotificationService(this.connections)

    if (articleVersion.access) {
      const data = {
        articleId: articleVersion.articleId,
        circleId: articleVersion.circleId,
        ...(secret ? { secret } : {}),
      }

      await atomService.upsert({
        table: 'article_circle',
        where: data,
        create: { ...data, access: articleVersion.access },
        update: {
          ...data,
          access: articleVersion.access,
        },
      })
    }

    // handle 'circle_new_article' notification
    const recipients = await userService.findCircleRecipients(
      articleVersion.circleId
    )

    recipients.forEach((recipientId: string) => {
      notificationService.trigger({
        event: NOTICE_TYPE.circle_new_article,
        recipientId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    })

    await invalidateFQC({
      node: { type: NODE_TYPES.Circle, id: articleVersion.circleId },
      redis: this.connections.redis,
    })
  }

  private handleTags = async ({
    article,
    articleVersion,
  }: {
    article: Article
    articleVersion: ArticleVersion
  }) => {
    const tagService = new TagService(this.connections)
    const tags = articleVersion.tags as string[]

    if (!tags?.length) {
      return []
    }

    // create tag records, return tag record if already exists
    const dbTags = (
      (await Promise.all(
        tags.filter(Boolean).map((content: string) =>
          tagService.create(
            { content, creator: article.authorId },
            {
              columns: ['id', 'content'],
              skipCreate: normalizeTagInput(content) !== content,
            }
          )
        )
      )) as unknown as [{ id: string; content: string }]
    ).filter(Boolean)

    // create article_tag record
    await tagService.createArticleTags({
      articleIds: [article.id],
      creator: article.authorId,
      tagIds: dbTags.map(({ id }) => id),
    })

    await Promise.all(
      dbTags.map((tag) =>
        invalidateFQC({
          node: { type: NODE_TYPES.Tag, id: tag.id },
          redis: this.connections.redis,
        })
      )
    )

    return tags
  }

  private handleMentions = async ({
    article,
    content,
  }: {
    article: Article
    content: string
  }) => {
    const mentionIds = extractMentionIds(content)

    const notificationService = new NotificationService(this.connections)
    mentionIds.forEach((id: string) => {
      if (!id) {
        return false
      }

      notificationService.trigger({
        event: NOTICE_TYPE.article_mentioned_you,
        actorId: article.authorId,
        recipientId: id,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
        tag: `publication:${article.id}`,
      })
    })
  }

  private handleCampaigns = async ({
    article,
    campaigns,
  }: {
    article: Article
    campaigns: Array<{ campaign: string; stage?: string }>
  }) => {
    const campaignService = new CampaignService(this.connections)
    for (const { campaign, stage } of campaigns) {
      await campaignService.submitArticleToCampaign(article, campaign, stage)
      invalidateFQC({
        node: { type: NODE_TYPES.Campaign, id: campaign },
        redis: this.connections.redis,
      })
    }
  }

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
}
