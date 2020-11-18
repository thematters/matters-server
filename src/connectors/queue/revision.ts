import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'
import * as cheerio from 'cheerio'
import _difference from 'lodash/difference'

import {
  ARTICLE_STATE,
  MINUTE,
  NODE_TYPES,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { environment, isTest } from 'common/environment'
import logger from 'common/logger'
import {
  extractAssetDataFromHtml,
  fromGlobalId,
  makeSummary,
} from 'common/utils'

import { BaseQueue } from './baseQueue'

class RevisionQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.revision)
    this.addConsumers()
  }

  addRepeatJobs = async () => {
    // publish pending draft of revised article every 21 minutes
    this.q.add(
      QUEUE_JOB.publishPendingRevisionDrafts,
      {},
      {
        priority: QUEUE_PRIORITY.HIGH,
        repeat: {
          every: MINUTE * 21,
        },
      }
    )
  }

  publishRevisedArticle = ({ draftId }: { draftId: string }) => {
    return this.q.add(
      QUEUE_JOB.publishRevisedArticle,
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

    // publish revised article
    this.q.process(
      QUEUE_JOB.publishRevisedArticle,
      QUEUE_CONCURRENCY.publishRevisedArticle,
      this.handlePublishRevisedArticle
    )

    // publish pending drafts of revised article
    this.q.process(
      QUEUE_JOB.publishPendingRevisionDrafts,
      this.handlePublishPendingRevisionDrafts
    )
  }

  /**
   * Publish revised article
   */
  private handlePublishRevisedArticle: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    try {
      const { draftId } = job.data as { draftId: string }
      const draft = await this.draftService.baseFindById(draftId)

      // Step 1: checks
      if (!draft) {
        job.progress(100)
        done(null, `Revision draft ${draftId} not found`)
        return
      }
      if (draft.publishState !== PUBLISH_STATE.pending) {
        job.progress(100)
        done(null, `Publication of revision draft ${draftId} is not pending.`)
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

      // Step 2: publish content to IPFS, and handles error including notification
      let ipfs: any
      try {
        ipfs = await this.articleService.publishToIPFS({
          ...draft,
          summary: draft.summary || makeSummary(draft.content),
        })

        if (!ipfs.dataHash || !ipfs.mediaHash) {
          throw new Error(
            `failed to publish content of draft ${draftId} to IPFS`
          )
        }
      } catch (error) {
        await this.draftService.baseUpdate(draft.id, {
          publishState: PUBLISH_STATE.error,
        })

        this.notificationService.trigger({
          event: 'revised_article_not_published',
          recipientId: article.authorId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: article,
            },
          ],
        })
        throw error
      }
      job.progress(30)

      // Step 3: mark draft as published and copy data back to article
      await this.draftService.baseUpdate(draft.id, {
        dataHash: ipfs.dataHash,
        mediaHash: ipfs.mediaHash,
        archived: true,
        publishState: PUBLISH_STATE.published,
        updatedAt: new Date(),
      })

      const updatedArticle = await this.articleService.baseUpdate(article.id, {
        dataHash: ipfs.dataHash,
        mediaHash: ipfs.mediaHash,
        draftId: draft.id,
      })
      job.progress(50)

      // Step 4: copy previous draft asset maps for current draft
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

      // Step 5: add to search
      const author = await this.userService.baseFindById(article.authorId)
      const { userName, displayName } = author
      await this.articleService.addToSearch({
        ...article,
        content: draft.content,
        userName,
        displayName,
      })
      job.progress(70)

      // Step 6: handle newly added mentions
      await this.handleMentions({
        article: updatedArticle,
        preDraftContent: preDraft.content,
        content: draft.content,
      })
      job.progress(90)

      // Step 7: trigger notifications
      this.notificationService.trigger({
        event: 'revised_article_published',
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

      // Step 8: invalidate article and user cache
      await Promise.all([
        invalidateFQC({
          node: { type: NODE_TYPES.user, id: article.authorId },
          redis: this.cacheService.redis,
        }),
        invalidateFQC({
          node: { type: NODE_TYPES.article, id: article.id },
          redis: this.cacheService.redis,
        }),
      ])
      job.progress(100)

      done(null, {
        dataHash: ipfs.dataHash,
        mediaHash: ipfs.mediaHash,
      })
    } catch (e) {
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
        event: 'article_mentioned_you',
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
   * Publish pending revision drafts
   */
  private handlePublishPendingRevisionDrafts: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    try {
      // find pending draft which article id is null
      const drafts = await this.draftService.findByPublishState({
        articleIdIsNull: false,
        publishState: PUBLISH_STATE.pending,
      })
      const pendingDraftIds: string[] = []

      drafts.forEach((draft: any, index: number) => {
        revisionQueue.publishRevisedArticle({ draftId: draft.id })
        pendingDraftIds.push(draft.id)
        job.progress(((index + 1) / drafts.length) * 100)
      })

      job.progress(100)
      done(null, pendingDraftIds)
    } catch (e) {
      done(e)
    }
  }
}

export const revisionQueue = new RevisionQueue()
