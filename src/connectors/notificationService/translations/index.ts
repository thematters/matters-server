import { makeSummary } from '@matters/ipns-site-generator'

import { i18n } from 'common/utils/i18n'

export default {
  user_new_follower: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 追蹤了你`,
    zh_hans: ({ displayName }) => `${displayName} 关注了你`,
    en: ({ displayName }) => `${displayName} followed you`,
  }),
  article_published: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的作品《${title}》已發佈到分佈式網絡`,
    zh_hans: ({ title }) => `你的作品《${title}》已发布到分布式网络`,
    en: ({ title }) => `Your article "${title}" has been published to IPFS`,
  }),
  article_new_collected: i18n<{
    displayName: string
    title: string
    collectionTitle: string
  }>({
    zh_hant: ({ displayName, title, collectionTitle }) =>
      `恭喜！你的大作《${title}》已被 ${displayName} 在其作品 《${collectionTitle}》 中關聯推薦`,
    zh_hans: ({ displayName, title, collectionTitle }) =>
      `恭喜！你的大作《${title}》已被 ${displayName} 在其作品 《${collectionTitle}》 中关联推荐`,
    en: ({ displayName, title, collectionTitle }) =>
      `Congratulations! Your work ${title} is been replied by ${displayName} in ${collectionTitle}`,
  }),
  article_new_appreciation: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 讚賞了你的作品`,
    zh_hans: ({ displayName }) => `${displayName} 赞赏了你的作品`,
    en: ({ displayName }) => `${displayName} appreciated your article`,
  }),
  article_new_subscriber: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 收藏了你的作品《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 收藏了你的作品《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} favorited your article "${title}"`,
  }),
  article_new_comment: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 評論了你的作品《${title}》`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 评论了你的作品《${title}》`,
    en: ({ displayName, title }) =>
      `${displayName} commented on your article "${title}"`,
  }),
  article_mentioned_you: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 在作品《${title}》中提及了你`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 在作品《${title}》中提及了你`,
    en: ({ displayName, title }) =>
      `${displayName} mentioned you in the article ${title}`,
  }),
  subscribed_article_new_comment: i18n<{ displayName: string; title: string }>({
    zh_hant: ({ displayName, title }) =>
      `${displayName} 評論了你收藏的作品 ${title}`,
    zh_hans: ({ displayName, title }) =>
      `${displayName} 评论了你收藏的作品 ${title}`,
    en: ({ displayName, title }) =>
      `${displayName} commented on your favorited article "${title}"`,
  }),
  comment_pinned: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 置頂了你的評論`,
    zh_hans: ({ displayName }) => `${displayName} 置顶了你的评论`,
    en: ({ displayName }) => `${displayName} pinned your comment`,
  }),
  comment_new_reply: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 回復了你的評論`,
    zh_hans: ({ displayName }) => `${displayName} 回复了你的评论`,
    en: ({ displayName }) => `${displayName} replied your comment`,
  }),
  comment_mentioned_you: i18n<{ displayName: string }>({
    zh_hant: ({ displayName }) => `${displayName} 在評論中提及了你`,
    zh_hans: ({ displayName }) => `${displayName} 在评论中提及了你`,
    en: ({ displayName }) => `${displayName} mentioned you in a comment`,
  }),
  payment_received_donation: i18n<{
    displayName: string
    userName: string
    amount: number
    currency: string
  }>({
    zh_hant: ({ displayName, userName, amount, currency }) =>
      `${displayName}（@${userName}）支持了你 ${amount} ${currency}，快去查看自己的收入吧！`,
    zh_hans: ({ displayName, userName, amount, currency }) =>
      `${displayName}（@${userName}）支持了你 ${amount} ${currency}，快去查看自己的收入吧！`,
    en: ({ displayName, userName, amount, currency }) =>
      `${displayName} (@${userName}) donated ${amount} ${currency} to you.`,
  }),
  official_announcement: i18n<{ message: string }>({
    zh_hant: ({ message }) => message,
    zh_hans: ({ message }) => message,
    en: ({ message }) => message,
  }),
  user_activiated: i18n({
    zh_hant: '恭喜！你已解鎖評論權限，快去參與討論吧。謝謝你喜歡 Matters 💗',
    zh_hans: '恭喜！你已解锁评论权限，快去参与讨论吧。谢谢你喜欢 Matters 💗',
    en: 'Congratulations! You have unlocked comment feature, and can now participate in the discussion. Thank you for enjoying Matters 💗',
  }),
  user_banned: i18n<{ banDays?: number }>({
    zh_hant: ({ banDays }) =>
      banDays
        ? `因為違反社區規則，您已被禁言 ${banDays} 天，無法發佈作品和評論`
        : '因為違反社區規則，您已被禁言，無法發佈作品和評論',
    zh_hans: ({ banDays }) =>
      banDays
        ? `因为违反社区规则，您已被禁言 ${banDays} 天，无法发布作品和评论`
        : '因为违反社区规则，您已被禁言，无法发布作品和评论',
    en: ({ banDays }) =>
      banDays
        ? 'You have been fobidden to publish any contents' +
          `and comments within ${banDays} days for vilolating the Term of Use`
        : 'You have been fobidden to publish any contents and comments for vilolating the Term of Use',
  }),
  user_banned_payment: i18n({
    zh_hant:
      '由於系統偵測到異常金流，您的帳號將被暫時凍結，有任何疑問請來信 hi@matters.town 聯繫站方',
    zh_hans:
      '由于系統检测到异常金流，您的账号將被暂时冻结，有任何疑问请來信 hi@matters.town 联系站方',
    en: 'Due to the detection of irregular transactions, your account has been temporarily suspended. If you require further clarification, please contact us at hi@matters.town',
  }),
  user_frozen: i18n({
    zh_hant: '因為違反社區規則，Matters 決定將您的賬戶凍結，無法在站上進行互動',
    zh_hans: '因为违反社区规则，Matters 决定将您的账户冻结，无法在站上进行互动',
    en: 'Your account has been deactivated for vilolating the Term of Use',
  }),
  user_unbanned: i18n({
    zh_hant: '你的評論與創作權限已恢復',
    zh_hans: '你的评论与创作权限已恢复',
    en: 'Your account has been recover.',
  }),
  comment_banned: i18n<{ content: string }>({
    zh_hant: ({ content }) =>
      `因為違反社區規則，您的評論「${makeSummary(content, 21)}」已被隱藏`,
    zh_hans: ({ content }) =>
      `因为违反社区规则，您的评论“${makeSummary(content, 21)}”已被隐藏`,
    en: ({ content }) =>
      `You comment "${makeSummary(
        content,
        21
      )}" has been archived from Matters for violating the community rules`,
  }),
  article_banned: i18n<{ title: string }>({
    zh_hant: ({ title }) => `因為違反社區規則，您的作品《${title}》已被隱藏`,
    zh_hans: ({ title }) => `因为违反社区规则，您的作品《${title}》已被隐藏`,
    en: ({ title }) =>
      `You article "${title}" has been archived from Matters for violating the community rules`,
  }),
  comment_reported: i18n<{ content: string }>({
    zh_hant: ({ content }) => `您的評論被舉報「${makeSummary(content, 17)}」`,
    zh_hans: ({ content }) => `您的评论被举报“${makeSummary(content, 17)}”`,
    en: ({ content }) =>
      `Your comment "${makeSummary(
        content,
        17
      )}" has been reported by other users`,
  }),
  article_reported: i18n<{ title: string }>({
    zh_hant: ({ title }) => `您的作品《${title}}》被舉報`,
    zh_hans: ({ title }) => `您的作品《${title}}》被举报`,
    en: ({ title }) =>
      `Your article "${title}" has been reported by other users`,
  }),
  revised_article_published: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的修訂作品《${title}》已發布到分佈式網絡`,
    zh_hans: ({ title }) => `你的修订作品《${title}》已发布到分布式网络`,
    en: ({ title }) =>
      `Your revised article "${title}" has been published to IPFS`,
  }),
  revised_article_not_published: i18n<{ title: string }>({
    zh_hant: ({ title }) => `你的修訂作品《${title}》發布失敗`,
    zh_hans: ({ title }) => `你的修订作品《${title}》发布失败`,
    en: ({ title }) =>
      `Your revised article "${title}" has not been published to IPFS`,
  }),
}
