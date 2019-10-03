import { USER_STATE } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { MutationToGenerateLikerIdResolver } from 'definitions'

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
    if (liker.accountType === 'temporal') {
      await userService.claimLikerId({
        userId: viewer.id,
        liker
      })
    }
  }

  // activate user
  const user = await userService.activate({ id: viewer.id })
  return user
}

export default resolver
