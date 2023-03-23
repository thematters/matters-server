import {
  GQLPossibleConnectionTypeNames,
  GQLPossibleNodeTypeNames,
} from 'definitions'

import frequentSearch from './frequentSearch.js'
import node from './node.js'
import nodes from './nodes.js'
import { announcements, features, translations } from './official/index.js'
import OSS from './oss/index.js'
import search from './search.js'

export default {
  Query: {
    node,
    nodes,
    search,
    frequentSearch,
    official: () => true,
    oss: () => true,
  },
  Node: {
    __resolveType: ({ __type }: { __type: GQLPossibleNodeTypeNames }) => __type,
  },
  Connection: {
    __resolveType: ({ __type }: { __type: GQLPossibleConnectionTypeNames }) =>
      __type,
  },
  Asset: {
    id: ({ uuid }: { uuid: string }) => uuid,
  },
  Official: {
    features,
    announcements,
  },
  Announcement: {
    translations,
  },
  OSS,
}
