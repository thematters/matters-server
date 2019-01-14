import { MutationToClearSearchHistoryResolver } from 'definitions'

const resolver: MutationToClearSearchHistoryResolver = async (
  _,
  __,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  await userService.clearSearches(viewer.id)

  return true
}

export default resolver
