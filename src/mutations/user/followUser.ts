import { MutationToFollowUserResolver } from 'definitions'

import toggleFollowUserResolver from './toggleFollowUser'

const resolver: MutationToFollowUserResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return toggleFollowUserResolver(
    parent,
    { input: { id, enabled: true } },
    ...rest
  )
}

export default resolver
