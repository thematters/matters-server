import { MutationToBlockUserResolver } from 'definitions'

import toggleBlockUserResolver from './toggleBlockUser'

const resolver: MutationToBlockUserResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return toggleBlockUserResolver(
    parent,
    { input: { id, enabled: true } },
    ...rest
  )
}

export default resolver
