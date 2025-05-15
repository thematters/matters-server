import type { GQLResolvers, GlobalId } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import channels from './announcement/channels.js'
import content from './announcement/content.js'
import link from './announcement/link.js'
import title from './announcement/title.js'
import frequentSearch from './frequentSearch.js'
import node from './node.js'
import nodes from './nodes.js'
import { announcements, features, translations } from './official/index.js'
import OSS from './oss/index.js'
import report from './report.js'
import search from './search.js'

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
    id: ({ uuid }: { uuid: string }) => uuid as GlobalId,
    path: (asset, _, { dataSources: { systemService } }) =>
      systemService.genAssetUrl(asset),
  },
  Official: {
    features,
    announcements,
  },
  Announcement: {
    id: ({ id }: { id: string }) =>
      toGlobalId({ type: NODE_TYPES.Announcement, id }),
    translations,
    title,
    content,
    link,
    channels,
  },
  OSS,
  Report: report,
}

export default system
