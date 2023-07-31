import type { GQLFollowingResolvers } from 'definitions'

import { TAG_ACTION } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLFollowingResolvers['tags'] = async (
  { id },
  { input },
  { dataSources: { atomService, tagService } }
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
      select: ['target_id'],
      where: { userId: id, action: TAG_ACTION.follow },
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(actions.map(({ targetId }) => targetId)),
    input,
    totalCount
  )
}

export default resolver
