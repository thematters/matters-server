import type { GQLResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

const schema: GQLResolvers = {
  Journal: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Comment, id }),
    content: ({ content }) => content,
    assets: ({ id }, _, { dataSources: { journalService } }) =>
      journalService.getAssets(id),
    author: ({ authorId }, _, { dataSources: { atomService } }) =>
      atomService.userIdLoader.load(authorId),
    state: ({ state }) => state,
  },
}

export default schema
