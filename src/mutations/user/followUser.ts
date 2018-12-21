import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const user = await userService.idLoader.load(dbId)
  if (!user) {
    throw new Error('target user does not exists') // TODO
  }

  await userService.follow(viewer.id, user.id)
  return true
}

export default resolver
