import type { Connections, Article } from '#definitions/index.js'
import type { Queue, ProcessCallbackFunction } from 'bull'

import {
  ARTICLE_STATE,
  NOTICE_TYPE,
  NODE_TYPES,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import { extractMentionIds } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import _difference from 'lodash/difference.js'

import { AtomService } from '../atomService.js'
import { NotificationService } from '../notification/notificationService.js'

import { getOrCreateQueue } from './utils.js'

const logger = getLogger('queue-revision')

interface RevisedArticleData {
  articleId: string
  oldArticleVersionId: string
  newArticleVersionId: string
  iscnPublish?: boolean
}

export class RevisionQueue {
  private connections: Connections
  private q: Queue

  public constructor(connections: Connections) {
    this.connections = connections
    const [q, created] = getOrCreateQueue(QUEUE_NAME.revision)
    this.q = q
    if (created) {
      this.addConsumers()
    }
  }

  public publishRevisedArticle = (data: RevisedArticleData) =>
    this.q.add(QUEUE_JOB.publishRevisedArticle, data, {
      priority: QUEUE_PRIORITY.CRITICAL,
    })

  /**
   * Cusumers
   */
  private addConsumers = () => {
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
  private handlePublishRevisedArticle: ProcessCallbackFunction<unknown> =
    async (job, done) => {
      const {
        articleId,
        oldArticleVersionId,
        newArticleVersionId,
        iscnPublish,
      } = job.data as RevisedArticleData

      const notificationService = new NotificationService(this.connections)
      const atomService = new AtomService(this.connections)

      const article = await atomService.articleIdLoader.load(articleId)
      const oldArticleVersion = await atomService.articleVersionIdLoader.load(
        oldArticleVersionId
      )
      const newArticleVersion = await atomService.articleVersionIdLoader.load(
        newArticleVersionId
      )

      // Step 1: checks
      if (!article) {
        job.progress(100)
        done(null, `Revised article ${articleId} not found`)
        return
      }
      if (!oldArticleVersion) {
        job.progress(100)
        done(null, `old article version ${oldArticleVersionId} not found`)
        return
      }

      if (!newArticleVersion) {
        job.progress(100)
        done(null, `new article version ${newArticleVersionId} not found`)
        return
      }

      if (article.state !== ARTICLE_STATE.active) {
        job.progress(100)
        done(null, `Revised article ${article.id} is not active`)
        return
      }
      job.progress(10)

      const { content: newContent } =
        await atomService.articleContentIdLoader.load(
          newArticleVersion.contentId
        )
      try {
        // Step 2: handle newly added mentions
        if (newArticleVersion.contentId !== oldArticleVersion.contentId) {
          const { content: oldContent } =
            await atomService.articleContentIdLoader.load(
              oldArticleVersion.contentId
            )
          await this.handleMentions(
            {
              article,
              preContent: oldContent,
              content: newContent,
            },
            notificationService
          )
        }
        job.progress(70)
      } catch (err) {
        // ignore errors caused by these steps
        logger.warn('job failed at optional step: %j', {
          err,
          job,
          articleVersionId: newArticleVersionId,
        })
      }

      // Step 3: trigger notifications
      notificationService.trigger({
        event: NOTICE_TYPE.revised_article_published,
        recipientId: article.authorId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })

      // Step 4: invalidate cache
      await Promise.all([
        invalidateFQC({
          node: { type: NODE_TYPES.User, id: article.authorId },
          redis: this.connections.redis,
        }),
        invalidateFQC({
          node: { type: NODE_TYPES.Article, id: article.id },
          redis: this.connections.redis,
        }),
      ])
      job.progress(100)

      done(null, {
        articleId: article.id,
        iscnPublish,
      })
    }

  private handleMentions = async (
    {
      article,
      preContent,
      content,
    }: {
      article: Article
      preContent: string
      content: string
    },
    notificationService: NotificationService
  ) => {
    const preIds = extractMentionIds(preContent)
    const currIds = extractMentionIds(content)

    const diffs = _difference(currIds, preIds)
    diffs.forEach((id: string) => {
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
}
