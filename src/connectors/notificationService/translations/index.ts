import { makeSummary } from 'common/utils'
import { i18n } from 'common/utils/i18n'
import { MAT_UNIT } from 'common/enums'

export default {
  user_new_follower: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 追蹤了你`,
    zh_hans: ({ displayName }) => `${displayName} 关注了你`,
    en: ({ displayName }) => `${displayName} followed you`
  }),
  article_published: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的作品《${title}》已發佈到分佈式網絡`,
    zh_hans: ({ title }) => `你的作品《${title}》已发布到分布式网络`,
    en: ({ title }) => `Your article "${title}" has been published to IPFS`
  }),
  article_new_downstream: i18n<{
    displayName: string
    title: string
  }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 引申了你的作品《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 引申了你的作品《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} extended your article "${title}"`
  }),
  article_new_collected: i18n<{
    displayName: string
    title: string
    collectionTitle: string
  }>({
    zh_hant: ({ displayName, title, collectionTitle }) =>
      `恭喜！你的大作《${title}》已被 ${displayName} 在其作品 《${collectionTitle}》 中關聯推薦`,
    zh_hans: ({ displayName, title, collectionTitle }) =>
      `恭喜！你的大作《${title}》已被 ${displayName} 在其作品 《${collectionTitle}》 中关联推荐`
  }),
  article_new_appreciation: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 讚賞了你的作品`,
    zh_hans: ({ displayName }) => `${displayName} 赞赏了你的作品`,
    en: ({ displayName }) => `${displayName} appreciated your article`
  }),
  article_new_subscriber: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 收藏了你的作品《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 收藏了你的作品《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} favorited your article "${title}"`
  }),
  article_new_comment: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 評論了你的作品《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 评论了你的作品《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} commented on your article "${title}"`
  }),
  article_mentioned_you: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 在作品《${title}》中提及了你`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 在作品《${title}》中提及了你`,
    en: ({ displayName, title }) =>
      `${displayName} mentioned you in the article ${title}`
  }),
  subscribed_article_new_comment: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 評論了你收藏的作品 ${title}`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 评论了你收藏的作品 ${title}`,
    en: ({ displayName, title }) =>
      `${displayName} commented on your favorited article "${title}"`
  }),
  upstream_article_archived: i18n({
    zh_hant: '你的作品上游已断开',
    zh_hans: '你的作品上游已断开',
    en: "Your article's upstream was archived"
  }),
  downstream_article_archived: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的作品的引申作品《${title}》被隐藏`,
    zh_hans: ({ title }) => `你的作品的引申作品《${title}》被隐藏`,
    en: ({ title }) => `Your article's downstream "${title}" was archived`
  }),
  comment_pinned: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 置頂了你的評論`,
    zh_hans: ({ displayName }) => `${displayName} 置顶了你的评论`,
    en: ({ displayName }) => `${displayName} pinned your comment`
  }),
  comment_new_reply: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 回復了你的評論`,
    zh_hans: ({ displayName }) => `${displayName} 回复了你的评论`,
    en: ({ displayName }) => `${displayName} replied your comment`
  }),
  comment_new_upvote: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 讚了你的評論`,
    zh_hans: ({ displayName }) => `${displayName} 赞了你的评论`,
    en: ({ displayName }) => `${displayName} liked your comment`
  }),
  comment_mentioned_you: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 在評論中提及了你`,
    zh_hans: ({ displayName }) => `${displayName} 在评论中提及了你`,
    en: ({ displayName }) => `${displayName} mentioned you in a comment`
  }),
  official_announcement: i18n<{ message: string }>({
    zh_hant: ({ message }) => message,
    zh_hans: ({ message }) => message,
    en: ({ message }) => message
  }),
  user_banned: i18n<{ banDays?: number }>({
    zh_hant: ({ banDays }) =>
      banDays
        ? `因為違反社區規則，Matters 決定將您禁言 ${banDays} 天，無法發佈作品、評論和讚賞`
        : '因為違反社區規則，Matters 決定將您禁言，無法發佈作品、評論和讚賞',
    zh_hans: ({ banDays }) =>
      banDays
        ? `因为违反社区规则，Matters 决定将您禁言 ${banDays} 天，无法发布作品、评论和赞赏`
        : '因为违反社区规则，Matters 决定将您禁言，无法发布作品、评论和赞赏',
    en: ({ banDays }) =>
      banDays
        ? 'You have been fobidden to publish any contents' +
          `, comments and like others within ${banDays} days for vilolating the Term of Use`
        : 'You have been fobidden to publish any contents, comments and like others for vilolating the Term of Use'
  }),
  user_frozen: i18n({
    zh_hant: '因為違反社區規則，Matters 決定將您的賬戶凍結，無法在站上進行互動',
    zh_hans: '因为违反社区规则，Matters 决定将您的账户冻结，无法在站上进行互动',
    en: 'Your account has been deactivated for vilolating the Term of Use'
  }),
  comment_banned: i18n<{ content: string }>({
    zh_hant: ({ content }) =>
      `因為違反社區規則，您的評論「${makeSummary(content, 21)}」已被隱藏`,
    zh_hans: ({ content }) => `您的评论“${makeSummary(content, 21)}”已被隐藏`,
    en: ({ content }) =>
      `You comment "${makeSummary(
        content,
        21
      )}" has been archived from Matters for violating the community rules`
  }),
  article_banned: i18n<{ title: string }>({
    zh_hant: ({ title }) => `因為違反社區規則，您的作品《${title}》已被隱藏`,
    zh_hans: ({ title }) => `因为违反社区规则，您的作品《${title}》已被隐藏`,
    en: ({ title }) =>
      `You article "${title}" has been archived from Matters for violating the community rules`
  }),
  comment_reported: i18n<{ content: string }>({
    zh_hant: ({ content }) => `您的評論被舉報「${makeSummary(content, 17)}」`,
    zh_hans: ({ content }) => `您的评论被举报“${makeSummary(content, 17)}”`,
    en: ({ content }) =>
      `Your comment "${makeSummary(
        content,
        17
      )}" has been reported by other users`
  }),
  article_reported: i18n<{ title: string }>({
    zh_hant: ({ title }) => `您的作品《${title}}》被舉報`,
    zh_hans: ({ title }) => `您的作品《${title}}》被举报`,
    en: ({ title }) =>
      `Your article "${title}" has been reported by other users`
  }),
  user_activated: i18n<{}>({
    zh_hant: () =>
      `好消息！社區全面開放，你已升級成為創作者。趕快發佈第一篇作品，贏取 ${MAT_UNIT.firstPost} MAT 獎勵吧！`,
    zh_hans: () =>
      `好消息！社区全面开放，你已升级成为创作者。赶快发布第一篇作品，赢取 ${MAT_UNIT.firstPost} MAT 奖励吧！`
  }),
  user_first_post_award: i18n<{}>({
    zh_hant: () =>
      `恭喜！你已成功發佈第一篇作品，請查收 ${MAT_UNIT.firstPost} MAT 獎勵。快去看看其他人寫了什麼，使用讚賞功能獎勵作者吧。`,
    zh_hans: () =>
      `恭喜！你已成功发布第一篇作品，请查收 ${MAT_UNIT.firstPost} MAT 奖励。快去看看其他人写了什么，使用赞赏功能奖励作者吧。`
  })
}
