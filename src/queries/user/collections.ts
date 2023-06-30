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

  const [records, totalCount] =
    await collectionService.findAndCountCollectionsByUser(id, { take, skip })

  // console.log('records', records)
  return connectionFromArray(records, input, totalCount)
}

export default resolver
