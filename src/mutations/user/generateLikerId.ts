import { AuthenticationError } from 'common/errors.js'
import { MutationToGenerateLikerIdResolver } from 'definitions'

const resolver: MutationToGenerateLikerIdResolver = async (
  _,
  __,
  { viewer, dataSources: { userService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
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

  const user = await userService.baseFindById(viewer.id)
  return user
}

export default resolver
