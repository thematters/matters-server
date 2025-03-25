import type { GQLQueryResolvers } from '#definitions/index.js'

import { USER_ROLE } from '#common/enums/index.js'

const resolver: GQLQueryResolvers['channel'] = async (
  _,
  { input: { shortHash } },
  { viewer, dataSources: { atomService } }
) => {
  const isAdmin = viewer.role === USER_ROLE.admin

  const channel = await atomService.findUnique({
    table: 'channel',
    where: { shortHash },
  })

  // If not admin, only return enabled channels
  if (!isAdmin && channel && !channel.enabled) {
    return null
  }

  return channel
}

export default resolver
