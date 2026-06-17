import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

export const moments: GQLOssResolvers['moments'] = async (
  _,
  { input },
  { dataSources: { momentService } }
) => {
  let query = momentService.findMoments()

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
    // rank scored moments by spam score, high to low
    query = query.whereNotNull('spam_score')
    orderBy = { column: 'spamScore', order: 'desc' }
  }

  return connectionFromQuery({ query, args: input, orderBy })
}
