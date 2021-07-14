import { invalidateFQC } from '@matters/apollo-response-cache'
import { makeSummary } from '@matters/matters-html-formatter'
import slugify from '@matters/slugify'
import Queue from 'bull'
import * as cheerio from 'cheerio'
import { trim, uniq } from 'lodash'

import {
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PIN_STATE,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { environment, isTest } from 'common/environment'
import logger from 'common/logger'
import {
  countWords,
  extractAssetDataFromHtml,
  fromGlobalId,
} from 'common/utils'

import { BaseQueue } from './baseQueue'

class PublicationQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.publication)
    this.addConsumers()
  }

  publishArticle = ({ draftId }: { draftId: string }) => {
    return this.q.add(
      QUEUE_JOB.publishArticle,
      { draftId },
      {
        priority: QUEUE_PRIORITY.CRITICAL,
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
  private handlePublishArticle: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const { draftId } = job.data as { draftId: string }
    const draft = await this.draftService.baseFindById(draftId)

    // Step 1: checks
    if (draft.publishState !== PUBLISH_STATE.pending) {
      job.progress(100)
      done(null, `Draft ${draftId} isn\'t in pending state.`)
      return
    }
    job.progress(5)

    try {
      const summary = draft.summary || makeSummary(draft.content)
      const wordCount = countWords(draft.content)

      // Step 2: publish content to IPFS
      const {
        contentHash: dataHash,
        mediaHash,
        key,
      } = await this.articleService.publishToIPFS(draft)
      job.progress(10)

      // Step 3: create an article
      const article = await this.articleService.createArticle({
        ...draft,
        draftId: draft.id,
        dataHash,
        mediaHash,
        summary,
        wordCount,
        slug: slugify(draft.title),
      })
      job.progress(20)

      // Step 4: update draft
      const publishedDraft = await this.draftService.baseUpdate(draft.id, {
        articleId: article.id,
        summary,
        wordCount,
        dataHash,
        mediaHash,
        archived: true,
        publishState: PUBLISH_STATE.published,
        pinState: PIN_STATE.pinned,
        updatedAt: new Date(),
      })
      job.progress(30)

      // Note: the following steps won't affect the publication.
      try {
        // Step 5: handle collection, circles, tags & mentions
        await this.handleCollection({ draft, article })
        job.progress(40)

        await this.handleCircle({ draft, article, secret: key })
        job.progress(45)

        const tags = await this.handleTags({ draft, article })
        job.progress(50)

        await this.handleMentions({ draft, article })
        job.progress(60)

        /**
         * Step 6: Handle Assets
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
        job.progress(70)

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
        job.progress(75)

        // Step 7: add to search
        const author = await this.userService.baseFindById(article.authorId)
        const { userName, displayName } = author
        await this.articleService.addToSearch({
          id: article.id,
          title: draft.title,
          content: draft.content,
          authorId: article.authorId,
          userName,
          displayName,
          tags,
        })
        job.progress(80)

        // Step 8: trigger notifications
        this.notificationService.trigger({
          event: DB_NOTICE_TYPE.article_published,
          recipientId: article.authorId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: article,
            },
          ],
        })
        job.progress(95)

        // Step 9: invalidate user cache
        await invalidateFQC({
          node: { type: NODE_TYPES.Draft, id: draft.id },
          redis: this.cacheService.redis,
        })
        await invalidateFQC({
          node: { type: NODE_TYPES.User, id: article.authorId },
          redis: this.cacheService.redis,
        })
        job.progress(100)
      } catch (e) {
        // ignore errors caused by these steps
        logger.error(e)
      }

      done(null, {
        articleId: article.id,
        draftId: publishedDraft.id,
        dataHash: publishedDraft.dataHash,
        mediaHash: publishedDraft.mediaHash,
      })
    } catch (e) {
      await this.draftService.baseUpdate(draft.id, {
        publishState: PUBLISH_STATE.error,
      })
      done(e)
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
      createdAt: new Date(),
      updatedAt: new Date(),
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
          {
            type: 'target',
            entityTable: 'article',
            entity: collection,
          },
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
    secret: any
  }) => {
    if (!draft.circleId || !draft.access) {
      return
    }

    const data = {
      articleId: article.id,
      circleId: draft.circleId,
      secret,
    }

    await this.atomService.upsert({
      table: 'article_circle',
      where: data,
      create: { ...data, access: draft.access },
      update: { ...data, access: draft.access, updatedAt: new Date() },
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

      tags = uniq(tags)
        .map(trim)
        .filter((t) => !!t)

      // create tag records, return tag record if already exists
      const dbTags = (await Promise.all(
        tags.map((tag: string) =>
          this.tagService.create({
            content: tag,
            creator: article.authorId,
            editors: tagEditors,
            owner: article.authorId,
          })
        )
      )) as unknown as [{ id: string; content: string }]

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
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: article,
          },
        ],
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
}

export const publicationQueue = new PublicationQueue()
