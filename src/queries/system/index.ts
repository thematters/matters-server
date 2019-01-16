import { GQLPossibleNodeTypeNames } from 'definitions'

import node from './node'
import search from './search'
import frequentSearch from './frequentSearch'
import {
  reportCategory,
  feedbackCategory,
  releases,
  links,
  placements,
  gatewayUrls
} from './official'
import { rootOSS, users, articles, tags, reports, report } from './oss'
import Report from './report'

export default {
  Query: {
    node,
    search,
    frequentSearch,
    official: () => true,
    oss: rootOSS
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
    releases, // TODO
    links, // TODO
    placements, // TODO
    gatewayUrls
  },
  OSS: {
    users,
    articles,
    tags,
    reports,
    report
  },
  Report
}
