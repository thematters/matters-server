import type { Connections } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'

import {
  APPRECIATION_TYPES,
  ARTICLE_STATE,
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
import { getLogger } from 'common/logger'
import {
  LikeCoin,
  AtomService,
  ArticleService,
  UserService,
  NotificationService,
} from 'connectors'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-appreciation')

interface AppreciationParams {
  amount: number
  articleId: string
  senderId: string
  senderIP?: string
  userAgent: string
}

export class AppreciationQueue extends BaseQueue {
  public constructor(connections: Connections) {
    // make it a bit slower on handling jobs in order to reduce concurrent operations
    super(QUEUE_NAME.appreciation, connections, {
      limiter: { max: 1, duration: 500 },
    })
    this.addConsumers()
  }

  /**
   * Producer for appreciation.
   *
   */
  public appreciate = ({
    amount,
    articleId,
    senderId,
    senderIP,
    userAgent,
  }: AppreciationParams) =>
    this.q.add(
      QUEUE_JOB.appreciation,
      { amount, articleId, senderId, senderIP, userAgent },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: true,
      }
    )

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
    const articleService = new ArticleService(this.connections)
    const userService = new UserService(this.connections)
    const notificationService = new NotificationService(this.connections)
    const atomService = new AtomService(this.connections)
    try {
      const { amount, articleId, senderId, senderIP, userAgent } =
        job.data as AppreciationParams

      if (!articleId || !senderId) {
        throw new Error('appreciation job has no required data')
      }

      const article = await atomService.findFirst({
        table: 'article',
        where: { id: articleId, state: ARTICLE_STATE.active },
      })
      if (!article) {
        throw new ArticleNotFoundError('article does not exist')
      }
      if (article.authorId === senderId) {
        throw new ForbiddenError('cannot appreciate your own article')
      }

      // check appreciate left
      const appreciateLeft = await articleService.appreciateLeftByUser({
        articleId,
        userId: senderId,
      })
      if (appreciateLeft <= 0) {
        throw new ActionLimitExceededError('too many appreciations')
      }

      // check if amount exceeded limit. if yes, then use the left amount.
      const validAmount = Math.min(amount, appreciateLeft)

      const [author, sender] = await Promise.all([
        userService.baseFindById(article.authorId),
        userService.baseFindById(senderId),
      ])

      if (!author || !sender) {
        throw new UserNotFoundError('user not found')
      }

      // insert appreciation record
      await articleService.appreciate({
        articleId: article.id,
        senderId,
        recipientId: article.authorId,
        amount: validAmount,
        type: APPRECIATION_TYPES.like,
      })

      // insert record to LikeCoin
      const likecoin = new LikeCoin(this.connections)
      if (author.likerId && sender.likerId) {
        likecoin.like({
          likerId: sender.likerId,
          likerIp: senderIP,
          userAgent,
          authorLikerId: author.likerId,
          url: `https://${environment.siteDomain}/a/${article.shortHash}`,
          amount: validAmount,
        })
      }

      // trigger notifications
      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_appreciation,
        actorId: sender.id,
        recipientId: author.id,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })

      // invalidate cache
      invalidateFQC({
        node: { type: NODE_TYPES.Article, id: article.id },
        redis: this.connections.redis,
      })
      invalidateFQC({
        node: { type: NODE_TYPES.User, id: article.authorId },
        redis: this.connections.redis,
      })

      job.progress(100)
      done(null, job.data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error(err)
      done(err)
    }
  }
}
