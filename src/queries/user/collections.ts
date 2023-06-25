import { fromGlobalId } from 'common/utils'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { UserToCollectionsResolver } from 'definitions'

const resolver: UserToCollectionsResolver = async (
  { input },
  _,
  { dataSources: { collectionService } }
) => {
  const { id } = input
  if (!id) {
    return []
  }

  const { take, skip } = fromConnectionArgs(input)
  const { id: dbId } = fromGlobalId(id)

  const [records, totalCount] =
    await collectionService.findAndCountCollectionsByUser(dbId, { take, skip })
  return connectionFromArray(records, input, totalCount)
}

export default resolver
