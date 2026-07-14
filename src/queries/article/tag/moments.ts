import type { GQLTagResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

const resolver: GQLTagResolvers['moments'] = async (
  { id },
  { input },
  { dataSources: { tagService, systemService } }
) => {
  const spamThreshold =
    (await systemService.getDiscoverySpamThreshold()) ?? undefined
  const query = tagService.findMoments({ id, spamThreshold })

  return connectionFromQuery({
    query,
    args: input,
    orderBy: { column: 'id', order: 'desc' },
  })
}

export default resolver
