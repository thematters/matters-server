import _ from 'lodash'

import { EMAIL_TEMPLATE_ID, VERIFICATION_CODE_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import { makeSummary, toGlobalId } from 'common/utils'
import { i18n } from 'common/utils/i18n'
import { ArticleService, SystemService, UserService } from 'connectors'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES, NoticeItem, User } from 'definitions'

const trans = {
  verificationCode: {
    subject: i18n<{ type: string }>({
      zh_hant: ({ type }) => `Matters | ${type}驗證碼`,
      zh_hans: ({ type }) => `Matters | ${type}验证码`
    }),
    register: i18n({
      zh_hant: '註冊',
      zh_hans: '注册'
    }),
    email_reset: i18n({
      zh_hant: '修改電子信箱',
      zh_hans: '修改电子邮箱'
    }),
    email_reset_confirm: i18n({
      zh_hant: '修改電子信箱',
      zh_hans: '修改电子邮箱'
    }),
    password_reset: i18n({
      zh_hant: '修改密碼',
      zh_hans: '修改密碼'
    }),
    email_verify: i18n({
      zh_hant: '電子信箱認證',
      zh_hans: '电子邮箱认证'
    })
  },
  registerSuccess: i18n({
    zh_hant: '歡迎成爲 Matters 創作者，這是一封新手必讀',
    zh_hans: '欢迎成为 Matters 创作者，这是一封新手必读'
  }),
  dailySummary: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) =>
      `🐿️ ${displayName}，這是專屬於你的 Matters 日報`,
    zh_hans: ({ displayName }) =>
      `🐿️ ${displayName}，这是专属于你的 Matters 日报`
  }),
  userDeleted: i18n({
    zh_hant: 'Matters | 你的賬號已被註銷',
    zh_hans: 'Matters | 你的账号已被注销'
  })
}

class Mail {
  sendVerificationCode = async ({
    to,
    type,
    code,
    recipient,
    language = 'zh_hant'
  }: {
    to: string
    type: keyof typeof VERIFICATION_CODE_TYPES
    code: string
    recipient: {
      displayName?: string
    }
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.verificationCode[language]
    const codeTypeStr = trans.verificationCode[type](language, {})
    const subject = trans.verificationCode.subject(language, {
      type: codeTypeStr
    })
    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore https://github.com/sendgrid/sendgrid-nodejs/issues/729
          dynamic_template_data: {
            subject,
            siteDomain: environment.siteDomain,
            code,
            type: codeTypeStr,
            recipient
          }
        }
      ]
    })
  }

  sendRegisterSuccess = async ({
    to,
    recipient,
    language = 'zh_hant'
  }: {
    to: string
    recipient: {
      displayName?: string
    }
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.registerSuccess[language]
    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject: trans.registerSuccess(language, {}),
            siteDomain: environment.siteDomain,
            recipient
          }
        }
      ]
    })
  }

  sendDailySummary = async ({
    to,
    recipient,
    language = 'zh_hant',
    notices
  }: {
    to: string
    recipient: {
      displayName: string
    }
    language?: LANGUAGES
    notices: {
      user_new_follower: NoticeItem[]
      article_new_collected: NoticeItem[]
      article_new_appreciation: NoticeItem[]
      article_new_subscriber: NoticeItem[]
      article_new_comment: NoticeItem[]
      article_mentioned_you: NoticeItem[]
      comment_new_reply: NoticeItem[]
      comment_mentioned_you: NoticeItem[]
    }
  }) => {
    const userService = new UserService()
    const articleService = new ArticleService()
    const systemService = new SystemService()

    const templateId = EMAIL_TEMPLATE_ID.dailySummary[language]
    const subject = trans.dailySummary(language, {
      displayName: recipient.displayName
    })

    const getUserDigest = async (user: User | undefined) => {
      if (!user) {
        return
      }

      let avatar = user.avatar
      if (avatar) {
        const url = await systemService.findAssetUrl(avatar)
        if (url) {
          avatar = url
        }
      }

      return {
        id: user.id,
        userName: user.userName,
        displayName: user.displayName,
        avatar
      }
    }
    const getArticleDigest = async (article: any | undefined) => {
      if (!article) {
        return
      }
      return {
        id: article.id,
        author: await getUserDigest(
          await userService.baseFindById(article.authorId)
        ),
        title: article.title,
        slug: encodeURIComponent(article.slug),
        mediaHash: article.mediaHash
      }
    }
    const getCommentDigest = async (comment: any | undefined) => {
      if (!comment) {
        return
      }

      const content = makeSummary(comment.content, 21)

      return {
        id: comment.id,
        globalId: toGlobalId({ type: 'Comment', id: comment.id }),
        content: content.length === comment.content ? content : `${content}…`,
        article: await getArticleDigest(
          await articleService.baseFindById(comment.articleId)
        )
      }
    }
    const getActors = async (actors: User[]) => {
      return Promise.all(actors.map(async actor => getUserDigest(actor)))
    }

    const user_new_follower = await Promise.all(
      notices.user_new_follower.map(async ({ actors = [] }) => ({
        actors: await getActors(actors),
        actorCount: actors.length > 3 ? actors.length : false
      }))
    )
    const article_new_collected = await Promise.all(
      notices.article_new_collected.map(async ({ actors = [], entities }) => ({
        actor: await getUserDigest(actors[0]),
        article: await getArticleDigest(entities && entities.target)
      }))
    )
    const article_new_appreciation = await Promise.all(
      notices.article_new_appreciation.map(
        async ({ actors = [], entities }) => ({
          actors: await getActors(actors),
          article: await getArticleDigest(entities && entities.target)
        })
      )
    )
    const article_mentioned_you = await Promise.all(
      notices.article_mentioned_you.map(async ({ actors = [], entities }) => ({
        actor: await getUserDigest(actors[0]),
        article: await getArticleDigest(entities && entities.target)
      }))
    )
    const article_new_subscriber = await Promise.all(
      notices.article_new_subscriber.map(async ({ actors = [], entities }) => ({
        actors: await getActors(actors),
        article: await getArticleDigest(entities && entities.target)
      }))
    )
    const article_new_comment = await Promise.all(
      notices.article_new_comment.map(async ({ actors = [], entities }) => ({
        actors: await getActors(actors),
        article: await getArticleDigest(entities && entities.target)
      }))
    )
    const comment_new_reply = await Promise.all(
      notices.comment_new_reply.map(async ({ actors = [], entities }) => ({
        actor: await getUserDigest(actors[0]),
        comment: await getCommentDigest(entities && entities.target)
      }))
    )
    const comment_mentioned_you = await Promise.all(
      notices.comment_mentioned_you.map(async ({ actors = [], entities }) => ({
        actor: await getUserDigest(actors[0]),
        comment: await getCommentDigest(entities && entities.target)
      }))
    )

    const data = {
      section: {
        follow: !!_.get(notices.user_new_follower, '0'),
        article: [
          'article_new_collected',
          'article_new_appreciation',
          'article_new_subscriber',
          'article_new_comment'
        ].some(type => _.get(notices, `${type}.0`)),
        mention: [
          'article_mentioned_you',
          'comment_mentioned_you',
          'comment_new_reply'
        ].some(type => _.get(notices, `${type}.0`))
      },
      notices: {
        user_new_follower,
        article_new_collected,
        article_new_appreciation,
        article_new_subscriber,
        article_new_comment,
        article_mentioned_you,
        comment_new_reply,
        comment_mentioned_you
      }
    }

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            siteDomain: environment.siteDomain,
            recipient,
            ...data
          }
        }
      ]
    })
  }

  sendUserDeletedByAdmin = async ({
    to,
    recipient,
    language = 'zh_hant'
  }: {
    to: string
    recipient: {
      displayName: string
    }
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.userDeleted[language]
    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject: trans.userDeleted(language, {}),
            siteDomain: environment.siteDomain,
            recipient
          }
        }
      ]
    })
  }
}

export const mail = new Mail()
