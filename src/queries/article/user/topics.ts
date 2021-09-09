import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { UserToTopicsResolver } from 'definitions'

const resolver: UserToTopicsResolver = async (
  { id },
  { input },
  { dataSources: { atomService }, viewer }
) => {
  const { take, skip } = fromConnectionArgs(input)

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
    }),
  ])

  return connectionFromArray(topics, input, totalCount)
}

export default resolver
