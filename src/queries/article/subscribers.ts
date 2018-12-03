import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { uuid },
  _,
  { actionService, userService }
) => {
  const actions = await actionService.findActionByTarget(
    USER_ACTION.subscribeArticle,
    uuid
  )
  return userService.loader.loadMany(actions.map(({ userUUID }) => userUUID))
}

export default resolver
