import type { QueryToNodeResolver } from 'definitions'

import { getNode } from './utils'

const resolver: QueryToNodeResolver = async (_, { input: { id } }, context) =>
  getNode(id, context)

export default resolver
