import type { GQLTopicChannelResolvers } from '#definitions/index.js'
import type { Knex } from 'knex'

import { DEFAULT_TAKE_PER_PAGE } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import { connectionFromQuery } from '#common/utils/connections.js'

const resolver: GQLTopicChannelResolvers['articles'] = async (
  { id },
  { input },
  {
    viewer,
    dataSources: {
      channelService,
      atomService,
      articleService,
      commentService,
      paymentService,
      userService,
      systemService,
      searchService,
    },
  }
) => {
  const { oss } = input
  const isAdmin = viewer.hasRole('admin')
  if (oss === true && !isAdmin) {
    throw new ForbiddenError('Only admins can access OSS')
  }
  if (input.sort !== undefined && !isAdmin) {
    throw new ForbiddenError('Only admins can sort articles')
  }
  const channelThreshold = await systemService.getArticleChannelThreshold()
  const { query: baseQuery } = await channelService.findTopicChannelArticles(
    id,
    {
      channelThreshold: channelThreshold ?? undefined,
      datetimeRange: input.filter?.datetimeRange,
      addOrderColumn: input.sort === undefined ? true : false,
      flood: false,
    }
  )

  let query: Knex.QueryBuilder = baseQuery

  const key = input.filter?.searchKey?.trim()
  if (key && key.length > 0) {
    const { nodes: users } = await searchService.searchUsers({
      key,
      quicksearch: true,
    })
    const { nodes: articles } = await searchService.quicksearchArticles({
      key,
    })
    const userIds = users.map((user) => user.id)
    const articleIds = articles.map((article) => article.id)
    query = query.where((builder) =>
      builder.whereIn('authorId', userIds).orWhereIn('id', articleIds)
    )
  }

  let orderBy: {
    column: string
    order: 'asc' | 'desc'
  } = {
    column: 'order',
    order: 'asc',
  }
  switch (input.sort) {
    case 'newest':
      orderBy = { column: 'createdAt', order: 'desc' }
      break
    case 'mostAppreciations': {
      const { query: appreciationAmountQuery, column } =
        userService.addAppreciationAmountColumn(baseQuery)
      query = appreciationAmountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostBookmarks': {
      const { query: bookmarkCountQuery, column } =
        userService.addBookmarkCountColumn(baseQuery)
      query = bookmarkCountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostComments': {
      const { query: commentCountQuery, column } =
        await commentService.addCommentCountColumn(baseQuery)
      query = commentCountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostDonations': {
      const { query: donationCountQuery, column } =
        await paymentService.addDonationCountColumn(baseQuery)
      query = donationCountQuery
      orderBy = { column, order: 'desc' }
      break
    }
    case 'mostReadTime': {
      const { query: readTimeQuery, column } =
        articleService.addReadTimeColumn(baseQuery)
      query = readTimeQuery
      orderBy = { column, order: 'desc' }
      break
    }
    default:
      break
  }

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
  const connection = await connectionFromQuery({
    query,
    args: input,
    orderBy,
    // OSS can see all articles and uses offset based pagination
    maxTake: oss ? undefined : MAX_ITEM_COUNT,
    cursorColumn: oss ? undefined : 'id',
  })

  return {
    ...connection,
    edges: await Promise.all(
      connection.edges.map(async (edge) => {
        const channel = await atomService.findUnique({
          table: 'topic_channel',
          where: { id },
        })
        const pinnedArticles = channel?.pinnedArticles || []
        return {
          ...edge,
          pinned: pinnedArticles.includes(edge.node.id),
        }
      })
    ),
  }
}

export default resolver
