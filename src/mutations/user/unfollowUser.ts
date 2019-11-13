import { MutationToUnfollowUserResolver } from 'definitions'

import toggleFollowUserResolver from './toggleFollowUser'

const resolver: MutationToUnfollowUserResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return toggleFollowUserResolver(
    parent,
    { input: { id, enabled: false } },
    ...rest
  )
}

export default resolver
