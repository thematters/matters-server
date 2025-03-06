import type { GQLResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import articles from './articles'
import channels from './channels'
import description from './description'
import name from './name'

const schema: GQLResolvers = {
  Query: {
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
