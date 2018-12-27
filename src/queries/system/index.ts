import { NodeTypes, Context, GQLSearchInput } from 'definitions'

import node from './node'
import search from './search'

export default {
  Query: {
    node,
    search
  },
  Node: {
    __resolveType: ({ __type }: { __type: NodeTypes }) => __type
  },
  Asset: {
    id: ({ uuid }: { uuid: string }) => uuid
  }
}
