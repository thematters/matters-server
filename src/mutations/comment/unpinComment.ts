import { MutationToUnpinCommentResolver } from 'definitions'

import togglePinCommentResolver from './togglePinComment.js'

const resolver: MutationToUnpinCommentResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return togglePinCommentResolver(
    parent,
    { input: { id, enabled: false } },
    ...rest
  )
}

export default resolver
