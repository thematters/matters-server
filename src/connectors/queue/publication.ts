import type { CustomQueueOpts } from './utils'
import type { BasicAcceptedElems } from 'cheerio'
import type {
  Connections,
  UserOAuthLikeCoin,
  Article,
  ArticleVersion,
  ArticleConnection,
} from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'
import * as cheerio from 'cheerio'

import {
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  METRICS_NAMES,
  MINUTE,
} from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import { fromGlobalId, normalizeTagInput } from 'common/utils'
import {
  TagService,
  DraftService,
  ArticleService,
  UserService,
  SystemService,
  NotificationService,
  AtomService,
  aws,
} from 'connectors'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-publication')

export class PublicationQueue extends BaseQueue {
  public constructor(connections: Connections, customOpts?: CustomQueueOpts) {
    super(QUEUE_NAME.publication, connections, customOpts)
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
  protected addConsumers = () => {
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
  private handlePublishArticle: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const draftService = new DraftService(this.connections)
    const articleService = new ArticleService(this.connections)
    const userService = new UserService(this.connections)
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

    await draftService.baseUpdate(draft.id, {
      publishState: PUBLISH_STATE.published,
      articleId: article.id,
    })

    await job.progress(30)

    let tags: string[] = []
    // Note: the following steps won't affect the publication.
    // Section1: update local DB related
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

      tags = await this.handleTags({ article, articleVersion })
      await job.progress(50)

      await this.handleMentions({ article, content: draft.content })
      await job.progress(60)

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
      event: DB_NOTICE_TYPE.article_published,
      recipientId: article.authorId,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })

    // Step 8: invalidate user cache
    invalidateFQC({
      node: { type: NODE_TYPES.User, id: article.authorId },
      redis: this.connections.redis,
    })

    // Section2: publish to external services like: IPFS / IPNS / ISCN / etc...
    const author = await atomService.userIdLoader.load(article.authorId)
    let dataHash
    let mediaHash
    try {
      // publish content to IPFS
      const {
        contentHash,
        mediaHash: _mediaHash,
        key,
      } = await articleService.publishToIPFS(
        article,
        articleVersion,
        draft.content
      )
      dataHash = contentHash
      mediaHash = _mediaHash

      await job.progress(80)
      await atomService.update({
        table: 'article_version',
        data: {
          dataHash,
          mediaHash,
        },
        where: { id: articleVersion.id },
      })

      if (key && articleVersion.circleId) {
        const data = {
          articleId: article.id,
          circleId: articleVersion.circleId,
          // secret: key,
        }

        await atomService.update({
          table: 'article_circle',
          where: data,
          data: {
            ...data,
            secret: key,
            access: articleVersion.access,
          },
        })
      }

      // Step: iscn publishing
      // handling both cases of set to true or false, but not omit (undefined)
      if (iscnPublish || draft.iscnPublish != null) {
        const liker = (await userService.findLiker({
          userId: article.authorId,
        })) as UserOAuthLikeCoin
        const cosmosWallet = await userService.likecoin.getCosmosWallet({
          liker,
        })

        const { displayName, userName } = author
        const iscnId = await userService.likecoin.iscnPublish({
          mediaHash: `hash://sha256/${mediaHash}`,
          ipfsHash: `ipfs://${dataHash}`,
          cosmosWallet,
          userName: `${displayName} (@${userName})`,
          title: articleVersion.title,
          description: articleVersion.summary,
          datePublished: article.createdAt?.toISOString().substring(0, 10),
          url: `https://${environment.siteDomain}/a/${article.shortHash}`,
          tags,
          liker,
        })

        await atomService.update({
          table: 'article_version',
          where: { id: article.id },
          data: { iscnId },
        })
      }
      await job.progress(90)

      if (author.userName) {
        await articleService.publishFeedToIPNS({ userName: author.userName })
      }

      await job.progress(95)
    } catch (err) {
      // ignore errors caused by these steps
      logger.warn(
        'job IPFS optional step failed (will retry async later in listener):',
        { err, jobId: job.id, draftId: draft.id }
      )
    }
    // invalidate article cache
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
      dataHash: dataHash,
      mediaHash: mediaHash,
      iscnPublish: iscnPublish || draft.iscnPublish,
      iscnId: articleVersion.iscnId,
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
      const connection = await articleService.baseFindById(id)
      if (!connection) {
        logger.warn(`article connection not found: ${id}`)
        return
      }
      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_collected,
        recipientId: connection.authorId,
        actorId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'article', entity: connection },
          {
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
        event: DB_NOTICE_TYPE.circle_new_article,
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
    let tags = articleVersion.tags as string[]

    if (tags && tags.length > 0) {
      // get tag editor
      const tagEditors = environment.mattyId
        ? [environment.mattyId, article.authorId]
        : [article.authorId]

      // create tag records, return tag record if already exists
      const dbTags = (
        (await Promise.all(
          tags.filter(Boolean).map((content: string) =>
            tagService.create(
              {
                content,
                creator: article.authorId,
                editors: tagEditors,
                owner: article.authorId,
              },
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
    } else {
      tags = []
    }

    return tags
  }

  private handleMentions = async ({
    article,
    content,
  }: {
    article: Article
    content: string
  }) => {
    const $ = cheerio.load(content)
    const mentionIds = $('a.mention')
      .map((index: number, node: BasicAcceptedElems<any>) => {
        const id = $(node).attr('data-id')
        if (id) {
          return id
        }
      })
      .get()

    const notificationService = new NotificationService(this.connections)
    mentionIds.forEach((id: string) => {
      const { id: recipientId } = fromGlobalId(id)

      if (!recipientId) {
        return false
      }

      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_mentioned_you,
        actorId: article.authorId,
        recipientId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    })
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

  private handleRefreshIPNSFeed: Queue.ProcessCallbackFunction<unknown> =
    async (
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
