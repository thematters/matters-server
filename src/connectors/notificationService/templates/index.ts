import { makeSummary, stripHtml } from 'common/utils'

export default {
  user_new_follower: ({ displayName }: { displayName: string }) => ({
    message: `${displayName} 追蹤了你`
  }),
  article_published: ({ title }: { title: string }) => ({
    message: `你的文章《${title}》已發佈到分佈式網絡`
  }),
  article_new_downstream: ({
    displayName,
    title
  }: {
    displayName: string
    title: string
  }) => ({
    message: `${displayName} 引申了你的文章《${title}》`
  }),
  article_new_appreciation: ({ displayName }: { displayName: string }) => ({
    message: `${displayName} 讚賞了你的文章`
  }),
  article_new_subscriber: ({
    displayName,
    title
  }: {
    displayName: string
    title: string
  }) => ({
    message: `${displayName} 收藏了你的文章《${title}》`
  }),
  article_new_comment: ({
    displayName,
    title
  }: {
    displayName: string
    title: string
  }) => ({
    message: `${displayName} 評論了你收藏的文章《${title}》`
  }),
  subscribed_article_new_comment: ({
    displayName,
    title
  }: {
    displayName: string
    title: string
  }) => ({
    message: `${displayName} 評論了你收藏的文章 ${title}`
  }),

  upstream_article_archived: () => ({
    message: '你的文章上游已断开'
  }),
  downstream_article_archived: ({ title }: { title: string }) => ({
    message: `你的文章的引申文章《${title}》被隐藏`
  }),

  comment_pinned: ({ displayName }: { displayName: string }) => ({
    message: `${displayName} 置頂了你的評論`
  }),
  comment_new_reply: ({ displayName }: { displayName: string }) => ({
    message: `${displayName} 回復了你的評論 `
  }),
  comment_new_upvote: ({ displayName }: { displayName: string }) => ({
    message: `${displayName} 讚了你的評論 `
  }),
  comment_mentioned_you: ({ displayName }: { displayName: string }) => ({
    message: `${displayName} 在評論中提及了你`
  }),
  official_announcement: ({ message }: { message: string }) => ({
    message
  }),
  user_banned: ({ banDays }: { banDays?: number }) => ({
    message: banDays
      ? `因為違反社區規則，Matters 決定將您禁言 ${banDays} 天，無法發佈文章、評論和讚賞`
      : '因為違反社區規則，Matters 決定將您禁言，無法發佈文章、評論和讚賞'
  }),
  user_frozen: () => ({
    message: `因為違反社區規則，Matters 決定將您的賬戶凍結，無法在站上進行互動`
  }),
  comment_banned: ({ content }: { content: string }) => ({
    message: `因為違反社區規則，Matters 決定將您的評論《${makeSummary(
      stripHtml(content),
      17
    )}》隱藏`
  }),
  article_banned: ({ title }: { title: string }) => ({
    message: `因為違反社區規則，Matters 決定將您的文章《${title}》隱藏`
  }),
  comment_reported: ({ content }: { content: string }) => ({
    message: `您的評論被舉報《${makeSummary(stripHtml(content), 17)}》`
  }),
  article_reported: ({ title }: { title: string }) => ({
    message: `您的文章被舉報《${title}}》`
  })
}
