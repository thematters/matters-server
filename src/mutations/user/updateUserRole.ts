import type { GQLMutationResolvers } from 'definitions'

import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateUserRole'] = async (
  _,
  { input: { id, role } },
  { dataSources: { atomService } }
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
