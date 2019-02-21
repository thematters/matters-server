import { MutationToFollowUserResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import {
  AuthenticationError,
  UserFollowFailedError,
  UserNotFoundError
} from 'common/errors'

const resolver: MutationToFollowUserResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)

  if (viewer.id === dbId) {
    throw new UserFollowFailedError('cannot follow yourself')
  }

  const user = await userService.dataloader.load(dbId)
  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  await userService.follow(viewer.id, user.id)

  // trigger notificaiton
  notificationService.trigger({
    event: 'user_new_follower',
    actorId: viewer.id,
    recipientId: user.id
  })

  return user
}

export default resolver
