import type { GQLTagResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

const resolver: GQLTagResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { tagService, systemService } }
) => {
  const { sortBy } = input
  const spamThreshold = (await systemService.getSpamThreshold()) ?? undefined
  const isHottest = sortBy === 'byHottestDesc'

  const query = isHottest
    ? tagService.findHottestArticles(id)
    : tagService.findArticles({ id, spamThreshold })
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
