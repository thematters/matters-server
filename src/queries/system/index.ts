import { GQLPossibleNodeTypeNames } from 'definitions'

import node from './node'
import search from './search'
import { reportCategory, feedbackCategory, releases } from './official'

export default {
  Query: {
    node,
    search,
    official: () => true
  },
  Node: {
    __resolveType: ({ __type }: { __type: GQLPossibleNodeTypeNames }) => __type
  },
  Asset: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  Official: {
    reportCategory,
    feedbackCategory,
    releases
  }
}
