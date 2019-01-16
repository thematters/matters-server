import { AuthenticationError } from 'apollo-server'
import { MutationToFollowUserResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToFollowUserResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)

  if (viewer.id === dbId) {
    throw new Error('cannot follow yourself')
  }

  const user = await userService.dataloader.load(dbId)
  if (!user) {
    throw new Error('target user does not exists') // TODO
  }

  await userService.follow(viewer.id, user.id)

  // trigger notificaiton
  notificationService.trigger({
    event: 'user_new_follower',
    actorId: viewer.id,
    recipientId: user.id
  })

  return true
}

export default resolver
