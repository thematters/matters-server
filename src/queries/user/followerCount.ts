import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = ({ uuid }, _, { actionService }) => {
  return actionService.countActionByTarget(USER_ACTION.follow, uuid)
}

export default resolver
