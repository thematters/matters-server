import { MutationToPinCommentResolver } from 'definitions'

import togglePinCommentResolver from './togglePinComment.js'

const resolver: MutationToPinCommentResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return togglePinCommentResolver(
    parent,
    { input: { id, enabled: true } },
    ...rest
  )
}

export default resolver
