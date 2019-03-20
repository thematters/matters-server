import { makeSummary, stripHtml } from 'common/utils'
import { i18n } from 'common/utils/i18n'
import { MAT_UNIT } from 'common/enums'

export default {
  user_new_follower: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 追蹤了你`,
    zh_hans: ({ displayName }) => `${displayName} 关注了你`,
    en: ({ displayName }) => `${displayName} followed you`
  }),
  article_published: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的文章《${title}》已發佈到分佈式網絡`,
    zh_hans: ({ title }) => `你的文章《${title}》已发布到分布式网络`,
    en: ({ title }) => `Your article "${title}" has been published to IPFS`
  }),
  article_new_downstream: i18n<{
    displayName: string
    title: string
  }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 引申了你的文章《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 引申了你的文章《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} extended your article "${title}"`
  }),
  article_new_appreciation: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 讚賞了你的文章`,
    zh_hans: ({ displayName }) => `${displayName} 赞赏了你的文章`,
    en: ({ displayName }) => `${displayName} appreciated your article`
  }),
  article_new_subscriber: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 收藏了你的文章《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 收藏了你的文章《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} favorited your article "${title}"`
  }),
  article_new_comment: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 評論了你收藏的文章《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 评论了你收藏的文章《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} commented on your article "${title}"`
  }),
  subscribed_article_new_comment: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 評論了你收藏的文章 ${title}`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 评论了你收藏的文章 ${title}`,
    en: ({ displayName, title }) =>
      `${displayName} commented on your favorited article "${title}"`
  }),
  upstream_article_archived: i18n({
    zh_hant: '你的文章上游已断开',
    zh_hans: '你的文章上游已断开',
    en: "Your article's upstream was archived"
  }),
  downstream_article_archived: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的文章的引申文章《${title}》被隐藏`,
    zh_hans: ({ title }) => `你的文章的引申文章《${title}》被隐藏`,
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
        ? `因為違反社區規則，Matters 決定將您禁言 ${banDays} 天，無法發佈文章、評論和讚賞`
        : '因為違反社區規則，Matters 決定將您禁言，無法發佈文章、評論和讚賞',
    zh_hans: ({ banDays }) =>
      banDays
        ? `因为违反社区规则，Matters 决定将您禁言 ${banDays} 天，无法发布文章、评论和赞赏`
        : '因为违反社区规则，Matters 决定将您禁言，无法发布文章、评论和赞赏',
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
      `因為違反社區規則，Matters 決定將您的評論《${makeSummary(
        stripHtml(content),
        17
      )}》隱藏`,
    zh_hans: ({ content }) =>
      `因为违反社区规则，Matters 决定将您的评论《${makeSummary(
        stripHtml(content),
        17
      )}》隐藏`,
    en: ({ content }) =>
      `You comment "${makeSummary(
        stripHtml(content),
        17
      )}" has been archived from Matters for violating the community rules`
  }),
  article_banned: i18n<{ title: string }>({
    zh_hant: ({ title }) =>
      `因為違反社區規則，Matters 決定將您的文章《${title}》隱藏`,
    zh_hans: ({ title }) =>
      `因为违反社区规则，Matters 决定将您的文章《${title}》隐藏`,
    en: ({ title }) =>
      `You article "${title}" has been archived from Matters for violating the community rules`
  }),
  comment_reported: i18n<{ content: string }>({
    zh_hant: ({ content }) =>
      `您的評論被舉報《${makeSummary(stripHtml(content), 17)}》`,
    zh_hans: ({ content }) =>
      `您的评论被举报《${makeSummary(stripHtml(content), 17)}》`,
    en: ({ content }) =>
      `Your comment "${makeSummary(
        stripHtml(content),
        17
      )}" has been reported by other users`
  }),
  article_reported: i18n<{ title: string }>({
    zh_hant: ({ title }) => `您的文章《${title}}》被舉報`,
    zh_hans: ({ title }) => `您的文章《${title}}》被举报`,
    en: ({ title }) =>
      `Your article "${title}" has been reported by other users`
  }),
  user_activated_recipient: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) =>
      `你的好友 ${displayName} 邀請你成為 Matters 社區創作者，你的帳號已成功解鎖，擁有全部創作權限，期待你的大作。解鎖資格所贈送的 ${
        MAT_UNIT.joinByInvitation
      } MAT 已送達，請點擊錢包查看。`,
    zh_hans: ({ displayName }) =>
      `你的好友 ${displayName} 邀请你成为 Matters 社区创作者，你的账号已成功解锁，拥有全部创作权限，期待你的第一篇作品。解锁资格所赠送的 ${
        MAT_UNIT.joinByInvitation
      } MAT 已送达，请点击钱包查看。`
    // en: ({displayName}) => ``,
  }),
  user_activated_sender: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) =>
      `你的好友 ${displayName} 已透過你的邀請成為 Matters 創作者。感謝你們一起搭建 Matters 社群，${
        MAT_UNIT.invitationAccepted
      } MAT 獎勵已送達。`,
    zh_hans: ({ displayName }) =>
      `你的好友 ${displayName} 已通过你的邀请成为 Matters 创作者。感谢你们一起搭建 Matters 社群，${
        MAT_UNIT.invitationAccepted
      } MAT 奖励已送达。`
    // en: () => ``,
  })
}
