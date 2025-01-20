import type { GQLQueryResolvers } from 'definitions'

import { USER_ROLE } from 'common/enums'

const resolver: GQLQueryResolvers['channels'] = async (
  _,
  __,
  { viewer, dataSources: { atomService } }
) => {
  const isAdmin = viewer.role === USER_ROLE.admin

  if (isAdmin) {
    return atomService.findMany({ table: 'channel' })
  }

  return atomService.findMany({ table: 'channel', where: { enabled: true } })
}

export default resolver
