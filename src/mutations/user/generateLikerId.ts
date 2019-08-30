import { MutationToGenerateLikerIdResolver } from 'definitions'
import {
  AuthenticationError,
  ForbiddenError,
  AssetNotFoundError,
  DisplayNameInvalidError,
  UsernameExistsError,
  UsernameInvalidError,
  UserInputError
} from 'common/errors'

const resolver: MutationToGenerateLikerIdResolver = async (
  _,
  __,
  { viewer, dataSources: { userService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // generate
  if (!viewer.likerId) {
    await userService.registerLikerId({
      userId: viewer.id,
      userName: viewer.userName
    })
  }

  // claim
  else {
    await userService.claimLikerId({
      likerId: viewer.likerId
    })
  }

  return viewer
}

export default resolver
