import type { GQLTagResolvers } from '#definitions/index.js'

const resolver: GQLTagResolvers['numMoments'] = async (
  { id },
  _,
  { dataSources: { tagService, systemService } }
) => {
  const spamThreshold =
    (await systemService.getDiscoverySpamThreshold()) ?? undefined
  return tagService.countMoments({ id, spamThreshold })
}

export default resolver
