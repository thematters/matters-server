import type { GQLTagResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

const resolver: GQLTagResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { tagService, systemService } }
) => {
  const { sortBy } = input
  const spamThreshold =
    (await systemService.getDiscoverySpamThreshold()) ?? undefined
  // dark-launched discovery probation: `undefined` while flag is off (zero diff)
  const probationDays =
    (await systemService.getDiscoveryProbationDays()) ?? undefined
  const isHottest = sortBy === 'byHottestDesc'

  const query = isHottest
    ? tagService.findHottestArticles(id, probationDays)
    : tagService.findArticles({ id, spamThreshold, probationDays })
  const orderBy = { column: isHottest ? 'score' : 'id', order: 'desc' as const }

  const result = await connectionFromQuery({ query, args: input, orderBy })

  return {
    ...result,
    edges:
      result.edges?.map((edge) => ({
        ...edge,
        pinned: edge.node.tagPinned,
      })) || [],
  }
}

export default resolver
