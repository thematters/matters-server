import type { GQLUserResolvers } from '#definitions/index.js'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'

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
