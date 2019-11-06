import { AuthenticationError } from 'common/errors'
import { MutationToUnsubscribePushResolver } from 'definitions'

const resolver: MutationToUnsubscribePushResolver = async (
  _,
  { input: { deviceId } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  await userService.unsubscribePush({
    userId: viewer.id,
    deviceId
  })
  return viewer
}

export default resolver
