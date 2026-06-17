import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

export const comments: GQLOssResolvers['comments'] = async (
  _,
  { input },
  { dataSources: { commentService } }
) => {
  let query = commentService.findComments()

  const range = input?.filter?.datetimeRange
  if (range?.start) {
    query = query.where('created_at', '>=', range.start)
  }
  if (range?.end) {
    query = query.where('created_at', '<=', range.end)
  }

  let orderBy: { column: string; order: 'asc' | 'desc' } = {
    column: 'id',
    order: 'desc',
  }
  if (input?.sort === 'mostSpam') {
    // rank scored comments by spam score, high to low
    query = query.whereNotNull('spam_score')
    orderBy = { column: 'spamScore', order: 'desc' }
  }

  return connectionFromQuery({ query, args: input, orderBy })
}
