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

  return connectionFromQuery({ query, args: input, orderBy })
}

export default resolver
