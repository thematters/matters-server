import _ from 'lodash'

import { MutationToGenerateTempLikerIdsResolver } from 'definitions'

const resolver: MutationToGenerateTempLikerIdsResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const step = _.get(input, 'step', 50)

  await userService.likecoin.generateTempUsers({ step })

  return userService.countNoLikerId()
}

export default resolver
