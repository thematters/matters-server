import type { GQLUserResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLUserResolvers['collections'] = async (
  user,
  { input },
  { dataSources: { collectionService } }
) => {
  const { id } = user
  // if visitor is not logged in, return empty collections
  if (!id) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input)

  if (take === 0) {
    const [_, count] = await collectionService.findAndCountCollectionsByUser(
      id,
      { take: 1, skip }
    )
    return connectionFromArray([], input, count)
  }

  const [records, totalCount] =
    await collectionService.findAndCountCollectionsByUser(id, { take, skip })

  return connectionFromArray(records, input, totalCount)
}

export default resolver
