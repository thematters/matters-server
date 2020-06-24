import Queue from 'bull'

import {
  APPRECIATION_TYPES,
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
  snederIP?: string
}

class AppreciationQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.appreciation)
    this.addConsumers()
  }

  /**
   * Producer for appreciation.
   *
   */
  appreciate = ({ amount, articleId, senderId }: AppreciationParams) => {
    return this.q.add(
      QUEUE_JOB.appreciation,
      { amount, articleId, senderId },
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
        snederIP,
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
        likerIp: snederIP,
        authorLikerId: author.likerId,
        url: `${environment.siteDomain}/@${author.userName}/${article.slug}-${article.mediaHash}`,
        amount: validAmount,
      })

      // trigger notifications
      this.notificationService.trigger({
        event: 'article_new_appreciation',
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
        this.cacheService.invalidateFQC(NODE_TYPES.article, article.id)
        this.cacheService.invalidateFQC(NODE_TYPES.user, article.authorId)
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
