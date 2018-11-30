import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { id },
  _,
  { actionService, userService }
) => {
  const actions = await actionService.findActionByTarget(
    USER_ACTION.subscribeArticle,
    id
  )
  return userService.loader.loadMany(actions.map(({ userId }) => userId))
}

export default resolver
