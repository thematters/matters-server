import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { UserToCollectionsResolver } from 'definitions'

const resolver: UserToCollectionsResolver = async (
  user,
  { input },
  { dataSources: { collectionService } }
) => {
  const { id } = user
  // if visitor is not logged in, return empty collections
  if (!id) {
    return { edges: [], totalCount: 0 }
  }
  const { take, skip } = fromConnectionArgs(input)

  if (take === 0) {
    const [_, count] = await collectionService.findAndCountCollectionsByUser(
      id,
      { take: 1, skip }
    )
    return { edges: [], totalCount: count }
  }

  const [records, totalCount] =
    await collectionService.findAndCountCollectionsByUser(id, { take, skip })

  return connectionFromArray(records, input, totalCount)
}

export default resolver
