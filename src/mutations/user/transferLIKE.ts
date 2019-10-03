import _ from 'lodash'

import { fromGlobalId } from 'common/utils'
import { MutationToTransferLIKEResolver } from 'definitions'

const resolver: MutationToTransferLIKEResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const step = _.get(input, 'step', 50)
  const userIds = input && input.id ? [fromGlobalId(input.id).id] : undefined

  await userService.likecoin.transferLIKE({ step, userIds })

  return userService.countNoPendingLIKE()
}

export default resolver
