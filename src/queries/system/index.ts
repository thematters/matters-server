import {
  GQLPossibleConnectionTypeNames,
  GQLPossibleNodeTypeNames,
} from 'definitions'

import frequentSearch from './frequentSearch'
import ipfsAddress from './ipfsAddress'
import node from './node'
import {
  feedbackCategory,
  links,
  placements,
  releases,
  reportCategory,
} from './official'
import OSS from './oss'
import Report from './report'
import search from './search'

export default {
  Query: {
    node,
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
    ipfsAddress,
    reportCategory,
    feedbackCategory,
    releases, // TODO
    links,
    placements, // TODO
  },
  OSS,
  Report,
}
