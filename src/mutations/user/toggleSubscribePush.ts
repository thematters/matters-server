import { AuthenticationError } from 'common/errors'
import { MutationToToggleSubscribePushResolver } from 'definitions'

const resolver: MutationToToggleSubscribePushResolver = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // determine action
  let action: 'subscribePush' | 'unsubscribePush'
  if (enabled === undefined) {
    const device = await userService.findPushDevice({
      userId: viewer.id,
      deviceId: id
    })
    action = !!device ? 'unsubscribePush' : 'subscribePush'
  } else {
    action = enabled ? 'subscribePush' : 'unsubscribePush'
  }

  // run action
  await userService[action]({
    userId: viewer.id,
    deviceId: id
  })

  return viewer
}

export default resolver
