import type {
  Connections,
  NoticeItem,
  NoticeDetail,
  NoticeEntitiesMap,
  User,
  NotificationType,
  LANGUAGES,
  Article,
  Comment,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import { DAY, NOTICE_TYPE, COMMENT_TYPE } from '#common/enums/index.js'
import { isProd, environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { makeSummary } from '#common/utils/index.js'
import { MailService } from '#connectors/mail/index.js'
import _ from 'lodash'

import { ArticleService } from './article/articleService.js'
import { CommentService } from './commentService.js'
import { NotificationService } from './notification/notificationService.js'
import { SystemService } from './systemService.js'

const { uniqBy } = _

const logger = getLogger('service-daily-summary-email')

// Digest types for email templates
interface UserDigest {
  id: string
  userName: string | null
  displayName: string | null
  avatar: string | null
}

interface ArticleDigest {
  id: string
  author: UserDigest
  title: string | undefined
  shortHash: string
  appreciationsReceivedTotal: number
  responseCount: number
}

interface CommentDigest {
  id: string
  content: string
  article: ArticleDigest | undefined
}

// Type for article with required properties for digest generation
interface ArticleWithHash
  extends Pick<Article, 'id' | 'authorId' | 'shortHash'> {
  mediaHash: string
}

// Type for notices parameter in sendDailySummaryMail
interface NoticesParam {
  user_new_follower: NoticeItem[]
  article_new_collected: NoticeItem[]
  article_new_appreciation: NoticeItem[]
  article_new_subscriber: NoticeItem[]
  article_new_comment: NoticeItem[]
  article_mentioned_you: NoticeItem[]
  comment_new_reply: NoticeItem[]
  article_comment_mentioned_you: NoticeItem[]
  circle_invitation: NoticeItem[]
  circle_new_subscriber: NoticeItem[]
  circle_new_follower: NoticeItem[]
  circle_new_unsubscriber: NoticeItem[]
  circle_new_article: NoticeItem[]
  circle_new_broadcast: NoticeItem[]
  circle_new_broadcast_comments: NoticeItem[]
  circle_new_discussion_comments: NoticeItem[]
}

export class DailySummaryEmailService {
  private knex: Knex
  private knexRO: Knex
  private notificationService: NotificationService
  private articleService: ArticleService
  private commentService: CommentService
  private systemService: SystemService
  private mailService: MailService

  public constructor(connections: Connections, mailService: MailService) {
    this.knex = connections.knex
    this.knexRO = connections.knexRO
    this.notificationService = new NotificationService(connections)
    this.articleService = new ArticleService(connections)
    this.commentService = new CommentService(connections)
    this.systemService = new SystemService(connections)
    this.mailService = mailService
  }

  /**
   * Send daily summary emails to all qualified users
   */
  public sendDailySummaryEmails = async (): Promise<void> => {
    const users = await this.findDailySummaryUsers()

    const jobs = users.map(async (user) => {
      if (!user.email || !user.emailVerified) {
        logger.info(
          `User ${user.id} does not have a verified email address, skipping`
        )
        return
      }

      const notices = await this.findDailySummaryNoticesByUser(user.id)
      if (!notices || notices.length <= 0) {
        logger.info(`User ${user.id} does not have any notices, skipping`)
        return
      }

      const filterNotices = (type: NotificationType) =>
        notices.filter((notice) => notice.noticeType === type)

      await this.sendDailySummaryMail({
        to: user.email,
        recipient: {
          displayName: user.displayName || '',
        },
        notices: {
          user_new_follower: filterNotices(NOTICE_TYPE.user_new_follower),
          article_new_collected: filterNotices(
            NOTICE_TYPE.article_new_collected
          ),
          article_new_appreciation: filterNotices(
            NOTICE_TYPE.article_new_appreciation
          ),
          article_new_subscriber: filterNotices(
            NOTICE_TYPE.article_new_subscriber
          ),
          article_new_comment: filterNotices(NOTICE_TYPE.article_new_comment),
          article_mentioned_you: filterNotices(
            NOTICE_TYPE.article_mentioned_you
          ),
          comment_new_reply: filterNotices(NOTICE_TYPE.comment_new_reply),
          article_comment_mentioned_you: filterNotices(
            NOTICE_TYPE.article_comment_mentioned_you
          ),

          // circle
          circle_invitation: filterNotices(NOTICE_TYPE.circle_invitation),
          circle_new_subscriber: filterNotices(
            NOTICE_TYPE.circle_new_subscriber
          ),
          circle_new_follower: filterNotices(NOTICE_TYPE.circle_new_follower),
          circle_new_unsubscriber: filterNotices(
            NOTICE_TYPE.circle_new_unsubscriber
          ),
          circle_new_article: filterNotices(NOTICE_TYPE.circle_new_article),
          circle_new_broadcast: filterNotices(NOTICE_TYPE.circle_new_broadcast),
          circle_new_broadcast_comments: filterNotices(
            NOTICE_TYPE.circle_new_broadcast_comments
          ),
          circle_new_discussion_comments: filterNotices(
            NOTICE_TYPE.circle_new_discussion_comments
          ),
        },
        language: user.language,
      })
    })
    await Promise.all(jobs)
  }

  /**
   * Find users who should receive daily summary emails
   */
  public findDailySummaryUsers = async (): Promise<User[]> => {
    const recipients = await this.knexRO('notice')
      .select('user.*')
      .where({
        unread: true,
        deleted: false,
        'user_notify_setting.enable': true,
        'user_notify_setting.email': true,
      })
      .where(
        'notice.updated_at',
        '>=',
        this.knex.raw(`now() -  interval '1 days'`)
      )
      .join('user', 'user.id', 'recipient_id')
      .join(
        'user_notify_setting',
        'user_notify_setting.user_id',
        'recipient_id'
      )
      .groupBy('user.id')

    return recipients
  }

  /**
   * Find daily summary notices for a specific user
   */
  public findDailySummaryNoticesByUser = async (
    userId: string
  ): Promise<NoticeItem[]> => {
    const validNoticeTypes: NotificationType[] = [
      NOTICE_TYPE.user_new_follower,
      NOTICE_TYPE.article_new_collected,
      NOTICE_TYPE.article_new_appreciation,
      NOTICE_TYPE.article_new_subscriber,
      NOTICE_TYPE.article_new_comment,
      NOTICE_TYPE.article_mentioned_you,
      NOTICE_TYPE.comment_new_reply,
      NOTICE_TYPE.article_comment_mentioned_you,
    ]

    const noticeDetails = await this.notificationService.findDetail({
      where: [
        [{ recipientId: userId, deleted: false, unread: true }],
        [
          'notice.updated_at',
          '>=',
          this.knex.raw(`now() -  interval '1 days'`),
        ],
      ],
      whereIn: ['notice_detail.notice_type', validNoticeTypes],
    })

    const notices = await Promise.all(
      noticeDetails.map(async (n: NoticeDetail) => {
        const entities = (await this.notificationService.findEntities(
          n.id
        )) as NoticeEntitiesMap
        const actors = (await this.notificationService.findActors(n.id)).filter(
          (actor) =>
            new Date(actor.noticeActorCreatedAt) >=
            new Date(Date.now() - DAY * 1)
        )

        return {
          ...n,
          createdAt: n.updatedAt,
          type: n.noticeType,
          actors,
          entities,
        }
      })
    )

    const uniqNotices = uniqBy(notices, (n) => {
      const actors = n.actors.map(({ id }) => id).join('')
      const entities = `${n?.entities?.target?.id || ''}`
      const uniqId = `type:${n.type}::actors:${actors}::entities:${entities}`

      return uniqId
    })

    return uniqNotices
  }

  /**
   * Send individual daily summary email
   */
  private sendDailySummaryMail = async ({
    to,
    recipient,
    language,
    notices,
  }: {
    to: string
    recipient: {
      displayName: string
    }
    language: LANGUAGES
    notices: NoticesParam
  }) => {
    const templateId = this.getDailySummaryTemplateId(language)
    const subject = this.getDailySummarySubject(language, recipient.displayName)

    const user_new_follower = await Promise.all(
      notices.user_new_follower.map(async ({ actors = [] }) => ({
        actors: await this.getActorsDigest(actors),
        actorCount: actors.length > 3 ? actors.length : false,
      }))
    )
    const article_new_collected = await Promise.all(
      notices.article_new_collected.map(async ({ actors = [], entities }) => ({
        actor: await this.getUserDigest(actors[0]),
        article: await this.getArticleDigest(entities && entities.target),
      }))
    )
    const article_new_appreciation = await Promise.all(
      notices.article_new_appreciation.map(
        async ({ actors = [], entities }) => ({
          actors: await this.getActorsDigest(actors),
          article: await this.getArticleDigest(entities && entities.target),
        })
      )
    )
    const article_mentioned_you = await Promise.all(
      notices.article_mentioned_you.map(async ({ actors = [], entities }) => ({
        actor: await this.getUserDigest(actors[0]),
        article: await this.getArticleDigest(entities && entities.target),
      }))
    )
    const article_new_subscriber = await Promise.all(
      notices.article_new_subscriber.map(async ({ actors = [], entities }) => ({
        actors: await this.getActorsDigest(actors),
        article: await this.getArticleDigest(entities && entities.target),
      }))
    )
    const article_new_comment = await Promise.all(
      notices.article_new_comment.map(async ({ actors = [], entities }) => ({
        actors: await this.getActorsDigest(actors),
        article: await this.getArticleDigest(entities && entities.target),
      }))
    )
    const comment_new_reply = await Promise.all(
      notices.comment_new_reply.map(async ({ actors = [], entities }) => ({
        actor: await this.getUserDigest(actors[0]),
        comment: await this.getCommentDigest(entities && entities.target),
      }))
    )
    const comment_mentioned_you = await Promise.all(
      notices.article_comment_mentioned_you.map(
        async ({ actors = [], entities }) => ({
          actor: await this.getUserDigest(actors[0]),
          comment: await this.getCommentDigest(entities && entities.target),
        })
      )
    )
    const circle_new_subscriber = await Promise.all(
      notices.circle_new_subscriber.map(async ({ actors = [] }) => ({
        actor: await this.getUserDigest(actors[0]),
        actorCount: actors.length > 3 ? actors.length : false,
      }))
    )
    const circle_new_follower = await Promise.all(
      notices.circle_new_follower.map(async ({ actors = [] }) => ({
        actors: await this.getActorsDigest(actors),
        actorCount: actors.length > 3 ? actors.length : false,
      }))
    )
    const circle_new_unsubscriber = await Promise.all(
      notices.circle_new_unsubscriber.map(async ({ actors = [] }) => ({
        actor: await this.getUserDigest(actors[0]),
        actorCount: actors.length > 3 ? actors.length : false,
      }))
    )

    await this.mailService.send(
      {
        from: 'Matters<ask@matters.town>',
        templateId,
        personalizations: [
          {
            to,
            dynamicTemplateData: {
              subject,
              siteDomain: environment.siteDomain,
              recipient,
              section: {
                follow: !!notices.user_new_follower[0],
                article: !!(
                  notices.article_new_collected[0] ||
                  notices.article_new_appreciation[0] ||
                  notices.article_new_subscriber[0] ||
                  notices.article_new_comment[0]
                ),
                mention: !!(
                  notices.article_mentioned_you[0] ||
                  notices.article_comment_mentioned_you[0] ||
                  notices.comment_new_reply[0]
                ),
              },
              notices: {
                user_new_follower,
                article_new_collected,
                article_new_appreciation,
                article_new_subscriber,
                article_new_comment,
                article_mentioned_you,
                comment_new_reply,
                comment_mentioned_you,
                circle_new_subscriber,
                circle_new_follower,
                circle_new_unsubscriber,
              },
            },
          },
        ],
        trackingSettings: {
          ganalytics: {
            enable: true,
            utmSource: 'matters',
            utmMedium: 'email',
            utmContent: 'dailySummary',
          },
        },
      },
      false // not express
    )
  }

  /**
   * Get daily summary email template ID based on language and environment
   */
  private getDailySummaryTemplateId = (language: LANGUAGES): string => {
    const templateIdsDev = {
      zh_hant: 'd-ed73bc5a51ef491c9ce5bb0bea1b59d7',
      zh_hans: 'd-826d96247fb84b348687d6959e26a9e8',
      en: 'd-ed73bc5a51ef491c9ce5bb0bea1b59d7',
    }
    const templateIdsProd = {
      zh_hant: 'd-582228566ac34cd4a97d193d6ca8fbf6',
      zh_hans: 'd-6f7dc3a0f5f346a998e66f506be12a3c',
      en: 'd-582228566ac34cd4a97d193d6ca8fbf6',
    }
    const templateIds = isProd ? templateIdsProd : templateIdsDev
    return templateIds[language]
  }

  /**
   * Get daily summary email subject based on language
   */
  private getDailySummarySubject = (
    language: LANGUAGES,
    displayName: string
  ): string => {
    const copys = {
      zh_hant: `🐿️  ${displayName}，這是專屬於你的 Matters 日報`,
      zh_hans: `🐿️  ${displayName}，这是专属于你的 Matters 日报`,
      en: `🐿️  ${displayName}，這是專屬於你的 Matters 日報`,
    }
    return copys[language]
  }

  /**
   * Get user digest with avatar URL resolved - using SystemService
   */
  private getUserDigest = async (user: User): Promise<UserDigest> => {
    let avatar = user.avatar
    if (avatar) {
      const url = await this.systemService.findAssetUrl(avatar)
      avatar = url || avatar
    }

    return {
      id: user.id,
      userName: user.userName,
      displayName: user.displayName,
      avatar,
    }
  }

  /**
   * Get article digest with all related information - using existing services
   */
  private getArticleDigest = async (
    article: ArticleWithHash | null
  ): Promise<ArticleDigest | undefined> => {
    if (!article) {
      return
    }

    const [
      articleVersion,
      author,
      appreciationsReceivedTotal,
      articleCount,
      commentCount,
    ] = await Promise.all([
      this.articleService.loadLatestArticleVersion(article.id),
      this.knexRO('user').where({ id: article.authorId }).first(),
      this.articleService.sumAppreciation(article.id),
      this.articleService.countActiveConnectedBy(article.id),
      this.commentService.count(article.id, COMMENT_TYPE.article),
    ])

    const authorDigest = await this.getUserDigest(author)
    const responseCount = articleCount + commentCount

    return {
      id: article.id,
      author: authorDigest,
      title: articleVersion?.title,
      shortHash: article.shortHash,
      appreciationsReceivedTotal,
      responseCount,
    }
  }

  /**
   * Get comment digest with article information - using makeSummary from utils
   */
  private getCommentDigest = async (
    comment: Comment | null
  ): Promise<CommentDigest | undefined> => {
    if (!comment) {
      return
    }

    const content = makeSummary(comment.content || '', 21)
    const article = await this.knexRO('article')
      .select(['id', 'title', 'author_id', 'short_hash'])
      .where({ id: comment.targetId })
      .first()

    return {
      id: comment.id,
      content:
        content.length === (comment.content || '').length
          ? content
          : `${content}…`,
      article: await this.getArticleDigest(article),
    }
  }

  /**
   * Get actors digest array
   */
  private getActorsDigest = async (
    actors: User[]
  ): Promise<Array<UserDigest | undefined>> => {
    return Promise.all(actors.map(async (actor) => this.getUserDigest(actor)))
  }
}
