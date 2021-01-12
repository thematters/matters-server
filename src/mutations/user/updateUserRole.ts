import { fromGlobalId } from 'common/utils'
import { MutationToUpdateUserRoleResolver } from 'definitions'

import { updateUserInfo } from './utils'

const resolver: MutationToUpdateUserRoleResolver = async (
  _,
  { input: { id, role } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const user = await updateUserInfo(dbId, { role })

  return user
}

export default resolver
