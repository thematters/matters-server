import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { uuid },
  _,
  { actionService, userService }
) => {
  const followActions = await actionService.findActionByTarget(
    USER_ACTION.follow,
    uuid
  )
  return userService.loader.loadMany(
    followActions.map(({ userUUID }) => userUUID)
  )
}

export default resolver
