// import logger from 'common/logger'
import { fromGlobalId } from 'common/utils'
import { MutationToUpdateUserRoleResolver } from 'definitions'

const resolver: MutationToUpdateUserRoleResolver = async (
  _,
  { input: { id, role } },
  { viewer, dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const data = { role }

  const user = await atomService.update({
    table: 'user',
    where: { id: dbId },
    data,
  })

  return user
}

export default resolver
