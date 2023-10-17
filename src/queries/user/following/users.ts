import type { GQLFollowingResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLFollowingResolvers['users'] = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await userService.countFollowees(id)
  const actions = await userService.findFollowees({ userId: id, skip, take })

  return connectionFromPromisedArray(
    userService.loadByIds(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
