import type { GQLTagResolvers } from '#definitions/index.js'

const resolver: GQLTagResolvers['numMoments'] = async (
  { id },
  _,
  { dataSources: { tagService } }
) => {
  return tagService.countMoments({ id })
}

export default resolver
