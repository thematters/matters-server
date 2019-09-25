import _ from 'lodash'

import { MutationToGenerateTempLikerIdsResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToGenerateTempLikerIdsResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const step = _.get(input, 'step', 50)
  const userIds = input && input.id ? [fromGlobalId(input.id).id] : undefined

  await userService.likecoin.generateTempUsers({ step, userIds })

  return userService.countNoLikerId()
}

export default resolver
