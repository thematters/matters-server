import _ from 'lodash'

import { MutationToTransferLIKEResolver } from 'definitions'

const resolver: MutationToTransferLIKEResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const step = _.get(input, 'step', 50)

  await userService.likecoin.generateTempUsers({ step })

  return userService.countNoPendingLIKE()
}

export default resolver
