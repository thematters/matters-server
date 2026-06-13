import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

const schema: GQLResolvers = {
  Quote: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Quote, id }),
    article: ({ articleId }, _, { dataSources: { atomService } }) =>
      atomService.articleIdLoader.load(articleId),
    poster: ({ userId }, _, { dataSources: { atomService } }) =>
      atomService.userIdLoader.load(userId),
    createdAt: ({ createdAt }) => createdAt,
  },
}

export default schema
