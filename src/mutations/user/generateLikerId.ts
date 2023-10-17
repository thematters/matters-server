import type { GQLMutationResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'

const resolver: GQLMutationResolvers['generateLikerId'] = async (
  _,
  __,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  const { ip } = viewer

  const liker = await userService.findLiker({ userId: viewer.id })

  // generate
  if (!liker || !liker.likerId) {
    await userService.registerLikerId({
      userId: viewer.id,
      userName: viewer.userName,
      ip,
    })
  }

  // claim
  else {
    if (liker.accountType === 'temporal') {
      await userService.claimLikerId({
        userId: viewer.id,
        liker,
        ip,
      })
    }
  }

  return userService.baseFindById(viewer.id)
}

export default resolver
