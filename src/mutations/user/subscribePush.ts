import { AuthenticationError } from 'common/errors'
import { MutationToSubscribePushResolver } from 'definitions'

const resolver: MutationToSubscribePushResolver = async (
  _,
  { input: { deviceId } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  await userService.subscribePush({
    userId: viewer.id,
    deviceId
  })
  return viewer
}

export default resolver
