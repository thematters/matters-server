import type { GQLUserResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLUserResolvers['topics'] = async (
  { id },
  { input },
  { dataSources: { atomService }, viewer }
) => {
  const { take, skip } = fromConnectionArgs(input, { allowTakeAll: true })

  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isPublicOnly = !!input?.filter?.public || !isViewer

  const [totalCount, topics] = await Promise.all([
    atomService.count({
      table: 'topic',
      where: { userId: id, ...(isPublicOnly ? { public: true } : {}) },
    }),
    atomService.findMany({
      table: 'topic',
      where: { userId: id, ...(isPublicOnly ? { public: true } : {}) },
      take,
      skip,
      orderBy: [{ column: 'order', order: 'asc' }],
    }),
  ])

  return connectionFromArray(topics, input, totalCount)
}

export default resolver
