import { MutationToGenerateLikerIdResolver } from 'definitions'
import { AuthenticationError, ForbiddenError } from 'common/errors'

const resolver: MutationToGenerateLikerIdResolver = async (
  _,
  __,
  { viewer, dataSources: { userService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const liker = await userService.findLiker({ userId: viewer.id })

  // generate
  if (!liker || !liker.likerId) {
    await userService.registerLikerId({
      userId: viewer.id,
      userName: viewer.userName
    })
  }

  // claim
  else {
    if (liker.accountType !== 'temporal') {
      throw new ForbiddenError('viewer aleready has a likerId')
    }

    await userService.claimLikerId({
      userId: viewer.id,
      liker
    })
  }

  // return latest user object
  const user = await userService.baseFindById(viewer.id)
  return user
}

export default resolver
