import type { GQLMutationResolvers } from 'definitions/index.js'

import togglePinCommentResolver from './togglePinComment.js'

const resolver: GQLMutationResolvers['pinComment'] = async (
  parent,
  { input: { id } },
  ...rest
) => togglePinCommentResolver(parent, { input: { id, enabled: true } }, ...rest)

export default resolver
