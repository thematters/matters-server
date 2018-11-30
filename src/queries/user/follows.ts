import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { id },
  _,
  { actionService, userService }
) => {
  const followActions = await actionService.findActionByUser(
    USER_ACTION.follow,
    id
  )
  return userService.loader.loadMany(
    followActions.map(({ targetId }) => targetId)
  )
}

export default resolver
