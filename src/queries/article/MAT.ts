import lodash from 'lodash'

import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async ({ id }, _, { actionService }) => {
  const appreciateActions = await actionService.findActionByTarget(
    USER_ACTION.appreciate,
    id
  )
  return lodash.sumBy(appreciateActions, 'detail')
}

export default resolver
