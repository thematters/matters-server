import { MutationToClearSearchHistoryResolver } from 'definitions'
import { AuthenticationError } from 'common/errors'

const resolver: MutationToClearSearchHistoryResolver = async (
  _,
  __,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  await userService.clearSearches(viewer.id)

  return true
}

export default resolver
