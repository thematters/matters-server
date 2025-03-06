import type { GQLMutationResolvers } from 'definitions/index.js'

const resolver: GQLMutationResolvers['clearSearchHistory'] = async (
  _,
  __,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return true
  }

  await userService.clearSearches(viewer.id)

  return true
}

export default resolver
