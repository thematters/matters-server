import type { GQLCurationChannelResolvers } from '#definitions/index.js'
import type { Knex } from 'knex'

import { ForbiddenError } from '#common/errors.js'
import { connectionFromQuery } from '#common/utils/connections.js'

const resolver: GQLCurationChannelResolvers['articles'] = async (
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
    },
  }
) => {
  const { oss } = input
  const isAdmin = viewer.hasRole('admin')
  const sort = input.sort ?? 'newest'

  if (oss === true && !isAdmin) {
    throw new ForbiddenError('Only admins can access OSS')
  }
  if (sort !== 'newest' && !isAdmin) {
    throw new ForbiddenError('Only admins can sort articles')
  }

  const baseQuery = channelService.findCurationChannelArticles(id, {
    addOrderColumn: sort === 'newest' ? true : false,
  })

  let query: Knex.QueryBuilder = baseQuery
  let orderBy: {
    column: string
    order: 'asc' | 'desc'
  } = {
    column: 'order',
    order: 'asc',
  }
  switch (sort) {
    case 'newest':
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

  const connection = await connectionFromQuery({
    query,
    args: input,
    orderBy,
    // oss use offset based pagination
    cursorColumn: oss ? undefined : 'id',
  })

  return {
    ...connection,
    edges: await Promise.all(
      connection.edges.map(async (edge) => {
        const article = await atomService.findFirst({
          table: 'curation_channel_article',
          where: { articleId: edge.node.id, channelId: id },
        })
        return {
          ...edge,
          pinned: article.pinned,
        }
      })
    ),
  }
}

export default resolver
