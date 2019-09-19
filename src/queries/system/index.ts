import {
  GQLPossibleNodeTypeNames,
  GQLPossibleConnectionTypeNames
} from 'definitions'

import node from './node'
import search from './search'
import frequentSearch from './frequentSearch'
import {
  reportCategory,
  feedbackCategory,
  releases,
  links,
  placements
} from './official'
import Report from './report'
import OSS from './oss'

export default {
  Query: {
    node,
    search,
    frequentSearch,
    official: () => true,
    oss: () => true
  },
  Node: {
    __resolveType: ({ __type }: { __type: GQLPossibleNodeTypeNames }) => __type
  },
  Connection: {
    __resolveType: ({ __type }: { __type: GQLPossibleConnectionTypeNames }) =>
      __type
  },
  Asset: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  Official: {
    reportCategory,
    feedbackCategory,
    releases, // TODO
    links,
    placements // TODO
  },
  OSS,
  Report
}
