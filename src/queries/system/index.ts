import { NodeTypes } from 'definitions'

import node from './node'

export default {
  Query: {
    node
  },
  Entity: {
    __resolveType: () => 'Article'
  },
  Node: {
    __resolveType: ({ __type }: { __type: NodeTypes }) => __type
  }
}
