import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { uuid } },
  { viewer, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const user = await userService.uuidLoader.load(uuid)
  if (!user) {
    throw new Error('target user does not exists') // TODO
  }

  await userService.follow(viewer.id, user.id)
  return true
}

export default resolver
