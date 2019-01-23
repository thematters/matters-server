import { MutationToClearSearchHistoryResolver } from 'definitions'
import { AuthenticationError } from 'common/errors'

const resolver: MutationToClearSearchHistoryResolver = async (
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
