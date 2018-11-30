import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { id },
  _,
  { actionService, userService }
) => {
  const followActions = await actionService.findActionByTarget(
    USER_ACTION.follow,
    id
  )
  return userService.loader.loadMany(followActions.map(({ userId }) => userId))
}

export default resolver
