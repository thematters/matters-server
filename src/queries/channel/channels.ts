import type { GQLQueryResolvers } from '#definitions/index.js'

import { USER_ROLE } from '#common/enums/index.js'

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
