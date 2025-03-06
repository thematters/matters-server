import type { GQLQueryResolvers } from '#definitions/index.js'

import { getNode } from './utils.js'

const resolver: GQLQueryResolvers['node'] = async (
  _,
  { input: { id } },
  context
) => getNode(id, context) as any

export default resolver
