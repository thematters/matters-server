import { MutationToUnblockUserResolver } from 'definitions'

import toggleBlockUserResolver from './toggleBlockUser'

const resolver: MutationToUnblockUserResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return toggleBlockUserResolver(
    parent,
    { input: { id, enabled: false } },
    ...rest
  )
}

export default resolver
