import type { GQLMutationResolvers } from '#definitions/index.js'

const resolver: GQLMutationResolvers['clearSearchHistory'] = async (
  _,
  __,
  { viewer, dataSources: { searchService } }
) => {
  if (!viewer.id) {
    return true
  }

  await searchService.clearSearches(viewer.id)

  return true
}

export default resolver
