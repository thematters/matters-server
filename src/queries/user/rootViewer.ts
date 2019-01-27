import { QueryToUserResolver } from 'definitions'
import { AuthenticationError } from 'common/errors'

const resolver: QueryToUserResolver = async (root, _, { viewer }) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  return viewer
}

export default resolver
