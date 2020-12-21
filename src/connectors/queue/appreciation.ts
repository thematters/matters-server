import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'

import {
  APPRECIATION_TYPES,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ActionLimitExceededError,
  ArticleNotFoundError,
  ForbiddenError,
  UserNotFoundError,
} from 'common/errors'
import logger from 'common/logger'

import { BaseQueue } from './baseQueue'
import { likeCoinQueue } from './likecoin'

interface AppreciationParams {
  amount: number
  articleId: string
  senderId: string
  senderIP?: string
  userAgent: string
}

class AppreciationQueue extends BaseQueue {
  constructor() {
    // make it a bit slower on handling jobs in order to reduce courrent operations
    super(QUEUE_NAME.appreciation, { limiter: { max: 1, duration: 500 } })
    this.addConsumers()
  }

  /**
   * Producer for appreciation.
   *
   */
  appreciate = ({
    amount,
    articleId,
    senderId,
    senderIP,
    userAgent,
  }: AppreciationParams) => {
    return this.q.add(
      QUEUE_JOB.appreciation,
      { amount, articleId, senderId, senderIP, userAgent },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: true,
      }
    )
  }

  /**
   * Consumers. Process a job at a time, so concurrency set as 1.
   *
   * @see https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueprocess
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.appreciation, 1, this.handleAppreciation)
  }

  /**
   * Appreciation handler.
   *
   */
  private handleAppreciation: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      const {
        amount,
        articleId,
        senderId,
        senderIP,
        userAgent,
      } = job.data as AppreciationParams

      if (!articleId || !senderId) {
        throw new Error('appreciation job has no required data')
      }

      const article = await this.articleService.baseFindById(articleId)
      if (!article) {
        throw new ArticleNotFoundError('article does not exist')
      }
      if (article.authorId === senderId) {
        throw new ForbiddenError('cannot appreciate your own article')
      }

      // check appreciate left
      const appreciateLeft = await this.articleService.appreciateLeftByUser({
        articleId,
        userId: senderId,
      })
      if (appreciateLeft <= 0) {
        throw new ActionLimitExceededError('too many appreciations')
      }

      // check if amount exceeded limit. if yes, then use the left amount.
      const validAmount = Math.min(amount, appreciateLeft)

      const [author, sender] = await Promise.all([
        this.userService.baseFindById(article.authorId),
        this.userService.baseFindById(senderId),
      ])

      if (!author || !sender) {
        throw new UserNotFoundError('user not found')
      }

      if (!author.likerId || !sender.likerId) {
        throw new ForbiddenError('user has no liker id')
      }

      // insert appreciation record
      await this.articleService.appreciate({
        articleId: article.id,
        senderId,
        recipientId: article.authorId,
        amount: validAmount,
        type: APPRECIATION_TYPES.like,
      })

      // insert record to LikeCoin
      likeCoinQueue.like({
        likerId: sender.likerId,
        likerIp: senderIP,
        userAgent,
        authorLikerId: author.likerId,
        url: `${environment.siteDomain}/@${author.userName}/${article.slug}-${article.mediaHash}`,
        amount: validAmount,
      })

      // trigger notifications
      this.notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_appreciation,
        actorId: sender.id,
        recipientId: author.id,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: article,
          },
        ],
      })

      // invalidate cache
      if (this.cacheService) {
        invalidateFQC({
          node: { type: NODE_TYPES.article, id: article.id },
          redis: this.cacheService.redis,
        })
        invalidateFQC({
          node: { type: NODE_TYPES.user, id: article.authorId },
          redis: this.cacheService.redis,
        })
      }

      job.progress(100)
      done(null, job.data)
    } catch (error) {
      logger.error(error)
      done(error)
    }
  }
}

export const appreciationQueue = new AppreciationQueue()
