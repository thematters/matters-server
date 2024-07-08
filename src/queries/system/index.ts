import type { GQLResolvers } from 'definitions'

import frequentSearch from './frequentSearch'
import node from './node'
import nodes from './nodes'
import { announcements, features, translations } from './official'
import OSS from './oss'
import report from './report'
import search from './search'

const system: GQLResolvers = {
  Query: {
    node,
    nodes,
    search,
    frequentSearch,
    official: () => ({} as any),
    oss: () => ({} as any),
  },
  Node: {
    __resolveType: ({ __type }: any) => __type,
  },
  Connection: {
    __resolveType: ({ __type }: any) => __type,
  },
  Asset: {
    id: ({ uuid }: { uuid: string }) => uuid,
    path: (asset, _, { dataSources: { systemService } }) =>
      systemService.genAssetUrl(asset),
  },
  Official: {
    features,
    announcements,
  },
  Announcement: {
    translations,
  },
  OSS,
  Report: report,
}

export default system
