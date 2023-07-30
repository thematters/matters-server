import type { GQLMutationResolvers } from 'definitions'

import togglePinCommentResolver from './togglePinComment'

const resolver: GQLMutationResolvers['unpinComment'] = async (
  parent,
  { input: { id } },
  ...rest
) =>
  togglePinCommentResolver(parent, { input: { id, enabled: false } }, ...rest)

export default resolver
