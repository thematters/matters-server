import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import articles from './articles.js'
import channel from './channel.js'
import channels from './channels.js'
import name from './name.js'
import note from './note.js'

const schema: GQLResolvers = {
  Query: {
    channel,
    channels,
  },
  TopicChannel: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Channel, id }),
    name,
    note,
    articles,
  },
  Channel: {
    __resolveType: ({ __type }: any) => __type,
  },
}

export default schema
