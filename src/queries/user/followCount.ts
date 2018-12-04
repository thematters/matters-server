import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = ({ uuid }, _, { actionService }) =>
  actionService.countActionByUser(USER_ACTION.follow, uuid)

export default resolver
