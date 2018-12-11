import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { type, enabled } },
  { viewer, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const notifySetting = await userService.findNotifySetting(viewer.id)

  return await userService.updateNotifySetting(notifySetting.id, {
    [type]: enabled
  })
}

export default resolver
