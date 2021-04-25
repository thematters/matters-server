import { invalidateFQC } from '@matters/apollo-response-cache'
import { makeSummary } from '@matters/matters-html-formatter'
import slugify from '@matters/slugify'
import Queue from 'bull'
import * as cheerio from 'cheerio'
import _difference from 'lodash/difference'

import {
  ARTICLE_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { isTest } from 'common/environment'
import logger from 'common/logger'
import { countWords, fromGlobalId } from 'common/utils'

import { BaseQueue } from './baseQueue'

class RevisionQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.revision)
    this.addConsumers()
  }

  publishRevisedArticle = (data: {
    draftId: string
    increaseRevisionCount: boolean
  }) => {
    return this.q.add(QUEUE_JOB.publishRevisedArticle, data, {
      priority: QUEUE_PRIORITY.CRITICAL,
    })
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    if (isTest) {
      return
    }

    // publish revised article
    this.q.process(
      QUEUE_JOB.publishRevisedArticle,
      QUEUE_CONCURRENCY.publishRevisedArticle,
      this.handlePublishRevisedArticle
    )
  }

  /**
   * Publish revised article
   */
  private handlePublishRevisedArticle: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    const { draftId, increaseRevisionCount } = job.data as {
      draftId: string
      increaseRevisionCount: boolean
    }
    const draft = await this.draftService.baseFindById(draftId)

    // Step 1: checks
    if (!draft) {
      job.progress(100)
      done(null, `Revision draft ${draftId} not found`)
      return
    }
    if (draft.publishState !== PUBLISH_STATE.pending) {
      job.progress(100)
      done(null, `Revision draft ${draftId} isn\'t in pending state.`)
      return
    }
    const article = await this.articleService.baseFindById(draft.articleId)
    if (!article) {
      job.progress(100)
      done(null, `Revised article ${draft.articleId} not found`)
      return
    }
    if (article.state !== ARTICLE_STATE.active) {
      job.progress(100)
      done(null, `Revised article ${draft.articleId} is not active`)
      return
    }
    const preDraft = await this.draftService.baseFindById(article.draftId)
    job.progress(10)

    try {
      const summary = draft.summary || makeSummary(draft.content)
      const wordCount = countWords(draft.content)

      // Step 2: publish content to IPFS
      const {
        contentHash: dataHash,
        mediaHash,
      } = await this.articleService.publishToIPFS({
        ...draft,
        summary,
      })
      job.progress(30)

      // Step 3: update draft
      await this.draftService.baseUpdate(draft.id, {
        dataHash,
        mediaHash,
        archived: true,
        publishState: PUBLISH_STATE.published,
        updatedAt: new Date(),
      })
      job.progress(40)

      // Step 4: update back to article
      const revisionCount =
        (article.revisionCount || 0) + (increaseRevisionCount ? 1 : 0)
      const updatedArticle = await this.articleService.baseUpdate(article.id, {
        draftId: draft.id,
        dataHash,
        mediaHash,
        summary,
        wordCount,
        revisionCount,
        slug: slugify(draft.title),
        updatedAt: new Date(),
      })
      job.progress(50)

      // Note: the following steps won't affect the publication.
      try {
        // Step 5: copy previous draft asset maps for current draft
        // Note: collection and tags are handled in edit resolver.
        // @see src/mutations/article/editArticle.ts
        const {
          id: entityTypeId,
        } = await this.systemService.baseFindEntityTypeId('draft')
        await this.systemService.copyAssetMapEntities({
          source: preDraft.id,
          target: draft.id,
          entityTypeId,
        })
        job.progress(60)

        // Step 6: add to search
        const author = await this.userService.baseFindById(article.authorId)
        const { userName, displayName } = author
        await this.articleService.addToSearch({
          ...article,
          content: draft.content,
          userName,
          displayName,
        })
        job.progress(70)

        // Step 7: handle newly added mentions
        await this.handleMentions({
          article: updatedArticle,
          preDraftContent: preDraft.content,
          content: draft.content,
        })
        job.progress(90)

        // Step 8: trigger notifications
        this.notificationService.trigger({
          event: DB_NOTICE_TYPE.revised_article_published,
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

        // Step 9: invalidate article and user cache
        await Promise.all([
          invalidateFQC({
            node: { type: NODE_TYPES.User, id: article.authorId },
            redis: this.cacheService.redis,
          }),
          invalidateFQC({
            node: { type: NODE_TYPES.Article, id: article.id },
            redis: this.cacheService.redis,
          }),
        ])
        job.progress(100)
      } catch (e) {
        // ignore errors caused by these steps
        logger.error(e)
      }

      done(null, {
        articleId: article.id,
        draftId: draft.id,
        dataHash,
        mediaHash,
      })
    } catch (e) {
      await this.draftService.baseUpdate(draft.id, {
        publishState: PUBLISH_STATE.error,
      })

      this.notificationService.trigger({
        event: DB_NOTICE_TYPE.revised_article_not_published,
        recipientId: article.authorId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: article,
          },
        ],
      })

      done(e)
    }
  }

  private handleMentions = async ({
    article,
    preDraftContent,
    content,
  }: {
    article: any
    preDraftContent: string
    content: string
  }) => {
    // gather pre-draft ids
    let $ = cheerio.load(preDraftContent)
    const filter = (index: number, node: any) => {
      const id = $(node).attr('data-id')
      if (id) {
        return id
      }
    }
    const preIds = $('a.mention').map(filter).get()

    // gather curr-draft ids
    $ = cheerio.load(content)
    const currIds = $('a.mention').map(filter).get()

    const diffs = _difference(currIds, preIds)
    diffs.forEach((id: string) => {
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
}

export const revisionQueue = new RevisionQueue()
