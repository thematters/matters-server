import _ from 'lodash'

import { makeSummary, toGlobalId } from 'common/utils'
import { i18n } from 'common/utils/i18n'
import { ArticleService, SystemService, UserService } from 'connectors'
import { User } from 'definitions'

export const trans = {
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
  }),
  migration: i18n({
    zh_hant: '搬家完成啦，立刻回到 Matters 進行宇宙傳輸吧！',
    zh_hans: '搬家完成啦，立刻回到 Matters 进行宇宙传输吧！'
  }),
  churn: {
    newRegisterCommentable: i18n<{ displayName: string }>({
      zh_hant: ({ displayName }) =>
        `🐿️ ${displayName}，上萬名作者正在 Matters 期待你的讚賞與討論！`,
      zh_hans: ({ displayName }) =>
        `🐿️ ${displayName}，上万名作者正在 Matters 期待你的赞赏与讨论！`
    }),
    newRegisterUncommentable: i18n<{ displayName: string }>({
      zh_hant: ({ displayName }) =>
        `🐿️ ${displayName}，你即將解鎖評論權限，上萬名作者正在 Matters 等待你參與討論！`,
      zh_hans: ({ displayName }) =>
        `🐿️ ${displayName}，你即将解锁评论权限，上万名作者正在 Matters 等待你参与讨论！`
    }),
    mediumTermHasFollowees: i18n<{ displayName: string }>({
      zh_hant: ({ displayName }) =>
        `🐿️ ${displayName}，你喜歡的作者回來了，還記得在 Matters 的舊時光嗎？`,
      zh_hans: ({ displayName }) =>
        `🐿️ ${displayName}，你喜欢的作者回来了，还记得在 Matters 的旧时光吗？`
    }),
    mediumTermHasNotFollowees: i18n<{ displayName: string }>({
      zh_hant: ({ displayName }) =>
        `🐿️ ${displayName}，在你離開的日子裡，Matters 有很多話想和你說`,
      zh_hans: ({ displayName }) =>
        `🐿️ ${displayName}，在你离开的日子里，Matters 有很多话想和你说`
    })
  }
}

const userService = new UserService()
const articleService = new ArticleService()
const systemService = new SystemService()

export const getUserDigest = async (user: User | undefined) => {
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

export const getArticleDigest = async (article: any | undefined) => {
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

export const getCommentDigest = async (comment: any | undefined) => {
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

export const getActors = async (actors: User[]) => {
  return Promise.all(actors.map(async actor => getUserDigest(actor)))
}
