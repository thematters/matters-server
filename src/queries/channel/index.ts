import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import articles from './articles.js'
import channel from './channel.js'
import channels from './channels.js'
import description from './description.js'
import name from './name.js'

const schema: GQLResolvers = {
  Query: {
    channel,
    channels,
  },
  Channel: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Channel, id }),
    name,
    description,
    articles,
  },
}

export default schema
