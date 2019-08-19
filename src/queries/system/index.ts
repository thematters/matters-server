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
import { users, articles, comments, tags, reports, report, today } from './oss'
import Report from './report'

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
  OSS: {
    users,
    articles,
    comments,
    tags,
    reports,
    report,
    today
  },
  Report
}
