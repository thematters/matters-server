import { fromGlobalId } from 'common/utils'
import { MutationToUpdateUserRoleResolver } from 'definitions'

const resolver: MutationToUpdateUserRoleResolver = async (
  _,
  { input: { id, role } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const user = await userService.updateInfo(dbId, { role })

  return user
}

export default resolver
