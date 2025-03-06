import type { GQLMutationResolvers } from 'definitions/index.js'

import { ForbiddenError } from 'common/errors.js'

const resolver: GQLMutationResolvers['setUserName'] = async (
  _,
  { input: { userName } },
  { viewer, dataSources: { userService } }
) => {
  const userNameEditable = await userService.isUserNameEditable(viewer.id)
  if (!userNameEditable) {
    throw new ForbiddenError('userName is not allow to edit')
  }

  return userService.setUserName(viewer.id, viewer.userName || '', userName)
}

export default resolver
