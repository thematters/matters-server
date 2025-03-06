import type { GQLUserResolvers } from 'definitions/index.js'

import { TAG_ACTION } from 'common/enums/index.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'

const resolver: GQLUserResolvers['bookmarkedTags'] = async (
  { id },
  { input },
  { dataSources: { atomService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, actions] = await Promise.all([
    atomService.count({
      table: 'action_tag',
      where: { userId: id, action: TAG_ACTION.follow },
    }),
    atomService.findMany({
      table: 'action_tag',
      select: ['targetId'],
      where: { userId: id, action: TAG_ACTION.follow },
      skip,
      take,
      orderBy: [{ column: 'updatedAt', order: 'desc' }],
    }),
  ])

  return connectionFromPromisedArray(
    atomService.tagIdLoader.loadMany(actions.map(({ targetId }) => targetId)),
    input,
    totalCount
  )
}

export default resolver
