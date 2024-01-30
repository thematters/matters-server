import type { GQLOssResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const reports: GQLOssResolvers['reports'] = async (
  _,
  { input },
  { dataSources: { atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const table = 'report'
  const countQuery = atomService.count({ table, where: {} })
  const reportsQuery = atomService.findMany({
    table,
    skip,
    take,
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })
  const [totalCount, items] = await Promise.all([countQuery, reportsQuery])

  return connectionFromPromisedArray(items, input, totalCount)
}
