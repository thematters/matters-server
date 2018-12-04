import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { userId },
  _,
  { actionService, userService }
) => {
  const followActions = await actionService.findActionByTarget(
    USER_ACTION.follow,
    userId
  )
  return userService.idLoader.loadMany(
    followActions.map(({ userId }) => userId)
  )
}

export default resolver
