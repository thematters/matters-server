import type { GQLMutationResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'

const resolver: GQLMutationResolvers['setUserName'] = async (
  _,
  { input: { userName } },
  { viewer, dataSources: { userService } }
) => {
  if (viewer.userName) {
    throw new ForbiddenError('userName is not allow to edit')
  }
  return userService.setUserName(viewer.id, userName)
}

export default resolver
