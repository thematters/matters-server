import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserResolvers['blockList'] = async (
  { id },
  { input },
  { dataSources: { atomService, userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await userService.countBlockList(id)
  const actions = await userService.findBlockList({ userId: id, skip, take })

  return connectionFromPromisedArray(
    atomService.userIdLoader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
