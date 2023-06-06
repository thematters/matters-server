import { invalidateFQC } from '@matters/apollo-response-cache'
import { makeSummary } from '@matters/ipns-site-generator'
import { html2md } from '@matters/matters-editor/transformers'
import slugify from '@matters/slugify'
import Queue from 'bull'
import * as cheerio from 'cheerio'

import {
  ARTICLE_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PIN_STATE,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import {
  countWords,
  extractAssetDataFromHtml,
  fromGlobalId,
  normalizeTagInput,
  // stripAllPunct,
} from 'common/utils'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-publication')

export class PublicationQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.publication)
    this.addConsumers()
  }

  publishArticle = ({
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
      }
    )

  refreshIPNSFeed = ({
    userName,
    numArticles = 50,
    forceReplace,
  }: {
    userName: string
    numArticles?: number
    forceReplace?: boolean
  }) =>
    this.q.add(
      QUEUE_JOB.refreshIPNSFeed,
      { userName, numArticles, forceReplace }
      // { priority: QUEUE_PRIORITY.CRITICAL, }
    )

  /**
   * Cusumers
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
  private handlePublishArticle: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const { draftId, iscnPublish } = job.data as {
      draftId: string
      iscnPublish?: boolean
    }
    let draft = await this.draftService.baseFindById(draftId)
    let article

    // Step 1: checks
    if (!draft || draft.publishState !== PUBLISH_STATE.pending) {
      await job.progress(100)
      done(null, `Draft ${draftId} isn't in pending state.`)
      return
    }
    await job.progress(5)

    try {
      const summary = draft.summary || makeSummary(draft.content)
      const wordCount = countWords(draft.content)

      // Step 2: create an article
      const articleData = {
        ...draft,
        draftId: draft.id,
        // dataHash,
        // mediaHash,
        summary,
        wordCount,
        slug: slugify(draft.title),
      }
      article = await (draft.articleId
        ? this.articleService.baseUpdate(draft.articleId, articleData)
        : this.articleService.createArticle(articleData))

      await job.progress(20)

      // Step 3: update draft and article state
      let contentMd = ''
      try {
        contentMd = html2md(draft.content)
      } catch (e) {
        logger.warn('draft %s failed to convert HTML to Markdown', draft.id)
      }
      const [publishedDraft, _] = await Promise.all([
        this.draftService.baseUpdate(draft.id, {
          articleId: article.id,
          summary,
          wordCount,
          contentMd,
          // dataHash,
          // mediaHash,
          archived: true,
          // iscnId,
          publishState: PUBLISH_STATE.published,
          pinState: PIN_STATE.pinned,
          updatedAt: this.knex.fn.now(), // new Date(),
        }),
        // this.articleService.baseUpdate(article.id, { iscnId }),
        this.articleService.baseUpdate(article.id, {
          state: ARTICLE_STATE.active,
        }),
      ])

      await job.progress(30)

      const author = await this.userService.baseFindById(draft.authorId)
      const { userName, displayName } = author
      let tags = draft.tags as string[]

      // Note: the following steps won't affect the publication.
      // Section1: update local DB related
      try {
        // Step 4: handle collection, circles, tags & mentions
        await this.handleCollection({ draft, article })
        await job.progress(40)

        await this.handleCircle({
          draft,
          article,
          // secret: key // TO update secret in 'article_circle' later after IPFS published
        })
        await job.progress(45)

        tags = await this.handleTags({ draft, article })
        await job.progress(50)

        await this.handleMentions({ draft, article })
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
            this.systemService.baseFindEntityTypeId('draft'),
            this.systemService.baseFindEntityTypeId('article'),
          ])

        // Remove unused assets
        await this.deleteUnusedAssets({ draftEntityTypeId, draft })
        await job.progress(70)

        // Swap cover assets from draft to article
        const coverAssets = await this.systemService.findAssetAndAssetMap({
          entityTypeId: draftEntityTypeId,
          entityId: draft.id,
          assetType: 'cover',
        })
        await this.systemService.swapAssetMapEntity(
          coverAssets.map((ast) => ast.id),
          articleEntityTypeId,
          article.id
        )
        await job.progress(75)
      } catch (err) {
        // ignore errors caused by these steps
        logger.warn('optional step failed: %j', { err, job, draft })
      }

      // Step 7: trigger notifications
      this.notificationService.trigger({
        event: DB_NOTICE_TYPE.article_published,
        recipientId: article.authorId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })

      // Step 8: invalidate user cache
      invalidateFQC({
        node: { type: NODE_TYPES.User, id: article.authorId },
        redis: this.cacheService.redis,
      })

      // Section2: publish to external services like: IPFS / IPNS / ISCN / etc...
      let ipnsRes: any
      try {
        // publish content to IPFS
        const {
          contentHash: dataHash,
          mediaHash,
          key,
        } = (await this.articleService.publishToIPFS(draft))!
        await job.progress(80)
        ;[article, draft] = await Promise.all([
          this.articleService.baseUpdate(article.id, {
            dataHash,
            mediaHash,
            updatedAt: this.knex.fn.now(),
          }),
          this.draftService.baseUpdate(draft.id, {
            dataHash,
            mediaHash,
            updatedAt: this.knex.fn.now(),
          }),
        ])

        if (key && draft.access) {
          const data = {
            articleId: article.id,
            circleId: draft.circleId,
            // secret: key,
          }

          await this.atomService.update({
            table: 'article_circle',
            where: data,
            data: {
              ...data,
              secret: key,
              access: draft.access,
              updatedAt: this.knex.fn.now(),
            },
          })
        }

        // Step: iscn publishing
        // handling both cases of set to true or false, but not omit (undefined)
        if (iscnPublish || draft.iscnPublish != null) {
          const liker = (await this.userService.findLiker({
            userId: author.id,
          }))! // as NonNullable<UserOAuthLikeCoin>
          const cosmosWallet = await this.userService.likecoin.getCosmosWallet({
            liker,
          })

          const iscnId = await this.userService.likecoin.iscnPublish({
            mediaHash: `hash://sha256/${mediaHash}`,
            ipfsHash: `ipfs://${dataHash}`,
            cosmosWallet,
            userName: `${displayName} (@${userName})`,
            title: draft.title,
            description: summary,
            datePublished: article.createdAt?.toISOString().substring(0, 10),
            url: `https://${environment.siteDomain}/@${userName}/${article.id}-${article.slug}-${article.mediaHash}`,
            tags,
            liker,
          })

          ;[article, draft] = await Promise.all([
            this.articleService.baseUpdate(article.id, {
              iscnId,
              updatedAt: this.knex.fn.now(),
            }),
            this.draftService.baseUpdate(draft.id, {
              iscnId,
              iscnPublish: iscnPublish || draft.iscnPublish,
              updatedAt: this.knex.fn.now(),
            }),
          ])
        }
        await job.progress(90)

        ipnsRes = await this.articleService.publishFeedToIPNS({
          userName,
          // incremental: true, // attach the last just published article
          updatedDrafts: [draft],
        })

        await job.progress(95)
      } catch (err) {
        // ignore errors caused by these steps
        logger.warn(
          'job IPFS optional step failed (will retry async later in listener):',
          err,
          job,
          draft
        )
      }

      // invalidate article cache
      invalidateFQC({
        node: { type: NODE_TYPES.Article, id: article.id },
        redis: this.cacheService.redis,
      })

      await job.progress(100)

      // no await to notify async
      this.articleService
        .sendArticleFeedMsgToSQS({ article, author, ipnsData: ipnsRes })
        .catch((err: Error) => logger.error('failed sqs notify:', err))

      // no await to notify async
      this.atomService.aws
        .snsPublishMessage({
          // MessageGroupId: `ipfs-articles-${environment.env}:articles-feed`,
          MessageBody: {
            articleId: article.id,
            title: article.title,
            url: `https://${environment.siteDomain}/@${userName}/${article.id}-${article.slug}`,
            dataHash: article.dataHash,
            mediaHash: article.mediaHash,

            // ipns info:
            ipnsKey: ipnsRes?.ipnsKey,
            lastDataHash: ipnsRes?.lastDataHash,

            // author info:
            userName,
            displayName,
          },
        })
        // .then(res => {})
        .catch((err: Error) => logger.error('failed sns notify:', err))

      done(null, {
        articleId: article.id,
        draftId: publishedDraft.id,
        dataHash: publishedDraft.dataHash,
        mediaHash: publishedDraft.mediaHash,
        iscnPublish: iscnPublish || draft.iscnPublish,
        iscnId: article.iscnId,
      })
    } catch (err: any) {
      await Promise.all([
        this.articleService.baseUpdate(article.id, {
          state: ARTICLE_STATE.error,
        }),
        this.draftService.baseUpdate(draft.id, {
          publishState: PUBLISH_STATE.error,
        }),
      ])
      done(err)
    }
  }

  private handleCollection = async ({
    draft,
    article,
  }: {
    draft: any
    article: any
  }) => {
    if (!draft.collection || draft.collection.length <= 0) {
      return
    }

    const items = draft.collection.map((articleId: string, index: number) => ({
      entranceId: article.id,
      articleId,
      order: index,
      // createdAt: new Date(), // default to CURRENT_TIMESTAMP
      // updatedAt: new Date(), // default to CURRENT_TIMESTAMP
    }))
    await this.articleService.baseBatchCreate(items, 'collection')

    // trigger notifications
    draft.collection.forEach(async (id: string) => {
      const collection = await this.articleService.baseFindById(id)
      this.notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_collected,
        recipientId: collection.authorId,
        actorId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'article', entity: collection },
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
    draft,
    article,
    secret,
  }: {
    draft: any
    article: any
    secret?: any
  }) => {
    if (!draft.circleId) {
      return
    }

    if (draft.access) {
      const data = {
        articleId: article.id,
        circleId: draft.circleId,
        ...(secret ? { secret } : {}),
      }

      await this.atomService.upsert({
        table: 'article_circle',
        where: data,
        create: { ...data, access: draft.access },
        update: {
          ...data,
          access: draft.access,
          updatedAt: this.knex.fn.now(),
        },
      })
    }

    // handle 'circle_new_article' notification
    const recipients = await this.userService.findCircleRecipients(
      draft.circleId
    )

    recipients.forEach((recipientId: any) => {
      this.notificationService.trigger({
        event: DB_NOTICE_TYPE.circle_new_article,
        recipientId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    })

    await invalidateFQC({
      node: { type: NODE_TYPES.Circle, id: draft.circleId },
      redis: this.cacheService.redis,
    })
  }

  private handleTags = async ({
    draft,
    article,
  }: {
    draft: any
    article: any
  }) => {
    let tags = draft.tags as string[]

    if (tags && tags.length > 0) {
      // get tag editor
      const tagEditors = environment.mattyId
        ? [environment.mattyId, article.authorId]
        : [article.authorId]

      // tags = Array.from(new Set(tags.map(stripAllPunct).filter(Boolean)))

      // create tag records, return tag record if already exists
      const dbTags = (
        (await Promise.all(
          tags.filter(Boolean).map((content: string) =>
            this.tagService.create(
              {
                content,
                creator: article.authorId,
                editors: tagEditors,
                owner: article.authorId,
              },
              {
                columns: ['id', 'content'],
                skipCreate:
                  // !content // || content.length > MAX_TAG_CONTENT_LENGTH,
                  normalizeTagInput(content) !== content,
              }
            )
          )
        )) as unknown as [{ id: string; content: string }]
      ).filter(Boolean)

      // create article_tag record
      await this.tagService.createArticleTags({
        articleIds: [article.id],
        creator: article.authorId,
        tagIds: dbTags.map(({ id }) => id),
      })

      // auto follow tags
      await Promise.all(
        dbTags.map(({ id }) =>
          this.tagService.follow({ targetId: id, userId: article.authorId })
        )
      )
    } else {
      tags = []
    }

    return tags
  }

  private handleMentions = async ({
    draft,
    article,
  }: {
    draft: any
    article: any
  }) => {
    const $ = cheerio.load(draft.content)
    const mentionIds = $('a.mention')
      .map((index: number, node: any) => {
        const id = $(node).attr('data-id')
        if (id) {
          return id
        }
      })
      .get()

    mentionIds.forEach((id: string) => {
      const { id: recipientId } = fromGlobalId(id)

      if (!recipientId) {
        return false
      }

      this.notificationService.trigger({
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
  private deleteUnusedAssets = async ({
    draftEntityTypeId,
    draft,
  }: {
    draftEntityTypeId: string
    draft: any
  }) => {
    try {
      const [assets, uuids] = await Promise.all([
        this.systemService.findAssetAndAssetMap({
          entityTypeId: draftEntityTypeId,
          entityId: draft.id,
        }),
        extractAssetDataFromHtml(draft.content),
      ])

      const unusedAssetPaths: { [id: string]: string } = {}
      assets.forEach((asset) => {
        const isCover = draft.cover === asset.assetId
        const isEmbed = uuids && uuids.includes(asset.uuid)

        if (!isCover && !isEmbed) {
          unusedAssetPaths[`${asset.assetId}`] = asset.path
        }
      })

      if (Object.keys(unusedAssetPaths).length > 0) {
        await this.systemService.deleteAssetAndAssetMap(unusedAssetPaths)
      }
    } catch (e) {
      logger.error(e)
    }
  }

  private handleRefreshIPNSFeed: Queue.ProcessCallbackFunction<unknown> =
    async (
      job // use Promise based job processing instead of `done`
    ) =>
      this.articleService.publishFeedToIPNS(
        job.data as {
          userName: string
          numArticles: number
          forceReplace?: boolean
        }
      )
}

export const publicationQueue = new PublicationQueue()
