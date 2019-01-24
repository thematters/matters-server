import { MutationToUpdateUserStateResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state, banDays } },
  { viewer, dataSources: { userService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  // TODO: banDays
  // TODO: trigger notification

  return await userService.baseUpdate(dbId, { state, updatedAt: new Date() })
}

export default resolver
