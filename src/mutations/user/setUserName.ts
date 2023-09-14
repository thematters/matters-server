import type { GQLMutationResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'

const resolver: GQLMutationResolvers['setUserName'] = async (
  _,
  { input: { userName } },
  { viewer, dataSources: { userService } }
) => {
  const userNameEditable = await userService.isUserNameEditable(viewer.id)
  if (!userNameEditable) {
    throw new ForbiddenError('userName is not allow to edit')
  }

  return userService.setUserName(viewer.id, userName)
}

export default resolver
