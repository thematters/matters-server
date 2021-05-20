import { makeSummary } from '@matters/matters-html-formatter'
import _ from 'lodash'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { i18n } from 'common/utils/i18n'
import {
  ArticleService,
  CommentService,
  SystemService,
  UserService,
} from 'connectors'
import { User } from 'definitions'

export const trans = {
  verificationCode: {
    register: i18n({
      zh_hant: 'Matters | 註冊驗證',
      zh_hans: 'Matters | 注册验证',
    }),
    email_reset: i18n({
      zh_hant: 'Matters | 修改電子信箱驗證',
      zh_hans: 'Matters | 修改邮箱验证',
    }),
    email_reset_confirm: i18n({
      zh_hant: 'Matters | 修改電子信箱驗證',
      zh_hans: 'Matters | 修改邮箱验证',
    }),
    password_reset: i18n({
      zh_hant: 'Matters | 修改密碼驗證',
      zh_hans: 'Matters | 修改密码验证',
    }),
    payment_password_reset: i18n({
      zh_hant: 'Matters | 修改交易密碼驗證',
      zh_hans: 'Matters | 修改交易密码验证',
    }),
  },
  registerSuccess: i18n({
    zh_hant: '歡迎來到 Matters 宇宙航艦，這是為你準備的登船指南',
    zh_hans: '欢迎来到 Matters 宇宙航舰，这是为你准备的登船指南',
  }),
  dailySummary: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) =>
      `🐿️ ${displayName}，這是專屬於你的 Matters 日報`,
    zh_hans: ({ displayName }) =>
      `🐿️ ${displayName}，这是专属于你的 Matters 日报`,
  }),
  userDeleted: i18n({
    zh_hant: 'Matters | 你的賬號已被註銷',
    zh_hans: 'Matters | 你的账号已被注销',
  }),
  migration: i18n({
    zh_hant: '搬家完成啦，立刻回到 Matters 進行宇宙傳輸吧！',
    zh_hans: '搬家完成啦，立刻回到 Matters 进行宇宙传输吧！',
  }),
  payment: {
    passwordSet: i18n({
      zh_hant: 'Matters | 你的交易密碼已成功設定',
      zh_hans: 'Matters | 你的交易密码已成功设定',
    }),
    passwordChanged: i18n({
      zh_hant: 'Matters | 你的交易密碼已修改成功',
      zh_hans: 'Matters | 你的交易密码已修改成功',
    }),
    creditAdded: i18n({
      zh_hant: 'Matters | 儲值成功',
      zh_hans: 'Matters | 储值成功',
    }),
    donated: i18n({
      zh_hant: 'Matters | 支付成功',
      zh_hans: 'Matters | 支付成功',
    }),
    receivedDonation: i18n({
      zh_hant: 'Matters | 你收到一筆來自他人的支持',
      zh_hans: 'Matters | 你收到一笔来自他人的支持',
    }),
    receivedDonationLikeCoin: i18n({
      zh_hant: 'Matters | 你收到一筆來自他人的支持',
      zh_hans: 'Matters | 你收到一笔来自他人的支持',
    }),
    payout: i18n({
      zh_hant: 'Matters | 你的提現流程已經啟動',
      zh_hans: 'Matters | 你的提现流程已经启动',
    }),
  },
  tag: {
    adoptTag: i18n<{ displayName: string; content: string }>({
      zh_hant: ({ displayName, content }) =>
        `${displayName}，你已成為 #${content} 的主理人，你做好準備了嗎？`,
      zh_hans: ({ displayName, content }) =>
        `${displayName}，你已成为 #${content} 的主理人，你做好准备了吗？`,
    }),
    assignAsTagEditor: i18n<{ displayName: string; content: string }>({
      zh_hant: ({ displayName, content }) =>
        `${displayName}，你已成為 #${content} 的協作者，你做好準備了嗎？`,
      zh_hans: ({ displayName, content }) =>
        `${displayName}，你已成为 #${content} 的协作者，你做好准备了吗？`,
    }),
  },
  circle: {
    invitation: i18n<{ sender: string; circle: string }>({
      zh_hant: ({ sender, circle }) =>
        `Matters | ${sender} 正在邀請你進入${circle}圍爐，你現在可免費加入！`,
      zh_hans: ({ sender, circle }) =>
        `Matters | ${sender} 正在邀请你进入${circle}围炉，你现在可免费加入！`,
    }),
  },
}

const userService = new UserService()
const articleService = new ArticleService()
const commentService = new CommentService()
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
    avatar,
  }
}

export const getArticleDigest = async (article: any | undefined) => {
  if (!article) {
    return
  }

  const author = await getUserDigest(
    await userService.baseFindById(article.authorId)
  )
  const appreciationsReceivedTotal = await articleService.sumAppreciation(
    article.id
  )
  const [articleCount, commentCount] = await Promise.all([
    articleService.countActiveCollectedBy(article.id),
    commentService.countByArticle(article.id),
  ])
  const responseCount = articleCount + commentCount

  return {
    id: article.id,
    author,
    title: article.title,
    slug: encodeURIComponent(article.slug),
    mediaHash: article.mediaHash,
    appreciationsReceivedTotal,
    responseCount,
  }
}

export const getCommentDigest = async (comment: any | undefined) => {
  if (!comment) {
    return
  }

  const content = makeSummary(comment.content, 21)

  return {
    id: comment.id,
    globalId: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
    content: content.length === comment.content ? content : `${content}…`,
    article: await getArticleDigest(
      await articleService.baseFindById(comment.articleId)
    ),
  }
}

export const getActors = async (actors: User[]) => {
  return Promise.all(actors.map(async (actor) => getUserDigest(actor)))
}
