import type { GQLOssResolvers } from '#definitions/index.js'
import type { Knex } from 'knex'

import { connectionFromQuery } from '#common/utils/connections.js'

export const articles: GQLOssResolvers['articles'] = async (
  _,
  { input },
  {
    dataSources: {
      articleService,
      systemService,
      userService,
      commentService,
      paymentService,
      searchService,
    },
  }
) => {
  let query: Knex.QueryBuilder = articleService.findArticles({
    datetimeRange: input?.filter?.datetimeRange,
  })
  if (input?.filter?.isSpam) {
    const spamThreshold = await systemService.getSpamThreshold()
    query = articleService.findArticles({
      isSpam: input?.filter?.isSpam ?? false,
      spamThreshold: spamThreshold ?? 0,
      datetimeRange: input?.filter?.datetimeRange,
    })
  }

  const key = input?.filter?.searchKey?.trim()
  if (key && key.length > 0) {
    const { nodes: users } = await searchService.searchUsers({
      key,
      quicksearch: true,
    })
    const { nodes: _articles } = await searchService.quicksearchArticles({
      key,
    })
    const userIds = users.map((user) => user.id)
    const articleIds = _articles.map((article) => article.id)
    query = query.where((builder) =>
      builder.whereIn('authorId', userIds).orWhereIn('id', articleIds)
    )
  }

  let orderBy: {
    column: string
    order: 'asc' | 'desc'
  } = {
    column: 'updatedAt',
    order: 'desc',
  }

  switch (input?.sort) {
    case 'newest':
      break
    case 'mostAppreciations': {
      const { query: appreciationAmountQuery, column } =
        userService.addAppreciationAmountColumn(query)
      query = appreciationAmountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostBookmarks': {
      const { query: bookmarkCountQuery, column } =
        userService.addBookmarkCountColumn(query)
      query = bookmarkCountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostComments': {
      const { query: commentCountQuery, column } =
        await commentService.addCommentCountColumn(query)
      query = commentCountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostDonations': {
      const { query: donationCountQuery, column } =
        await paymentService.addDonationCountColumn(query)
      query = donationCountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostReadTime': {
      const { query: readTimeQuery, column } =
        articleService.addReadTimeColumn(query)
      query = readTimeQuery
      orderBy = { column, order: 'desc' }
      break
    }
    default:
      break
  }

  return connectionFromQuery({
    query,
    args: input,
    orderBy,
  })
}
