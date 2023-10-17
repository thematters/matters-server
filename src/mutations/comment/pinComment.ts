import type { GQLMutationResolvers } from 'definitions'

import togglePinCommentResolver from './togglePinComment'

const resolver: GQLMutationResolvers['pinComment'] = async (
  parent,
  { input: { id } },
  ...rest
) => togglePinCommentResolver(parent, { input: { id, enabled: true } }, ...rest)

export default resolver
