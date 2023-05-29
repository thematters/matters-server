import { MutationToUnpinCommentResolver } from 'definitions'

import togglePinCommentResolver from './togglePinComment'

const resolver: MutationToUnpinCommentResolver = async (
  parent,
  { input: { id } },
  ...rest
) =>
  togglePinCommentResolver(parent, { input: { id, enabled: false } }, ...rest)

export default resolver
