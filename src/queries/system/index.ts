import {
  GQLPossibleConnectionTypeNames,
  GQLPossibleNodeTypeNames,
} from 'definitions'

import frequentSearch from './frequentSearch'
import node from './node'
import nodes from './nodes'
import { announcements, features, translations } from './official'
import OSS from './oss'
import search from './search'

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
