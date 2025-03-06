import type { GQLMutationResolvers } from '#definitions/index.js'

import togglePinCommentResolver from './togglePinComment.js'

const resolver: GQLMutationResolvers['unpinComment'] = async (
  parent,
  { input: { id } },
  ...rest
) =>
  togglePinCommentResolver(parent, { input: { id, enabled: false } }, ...rest)

export default resolver
