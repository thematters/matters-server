import type { GQLQueryResolvers } from 'definitions'

import { getNode } from './utils'

const resolver: GQLQueryResolvers['node'] = async (
  _,
  { input: { id } },
  context
) => getNode(id, context)

export default resolver
