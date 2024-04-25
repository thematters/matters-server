import type { GQLResolvers } from 'definitions'

import { NODE_TYPES, MATTERS_CHOICE_TOPIC_STATE } from 'common/enums'
import { toGlobalId } from 'common/utils'

const recommendation: GQLResolvers = {
  IcymiTopic: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.IcymiTopic, id }),
    articles: async ({ articles }, _, { dataSources: { atomService } }) =>
      atomService.articleIdLoader.loadMany(articles),
    archivedAt: ({ updatedAt, state }) =>
      state === MATTERS_CHOICE_TOPIC_STATE.archived ? updatedAt : null,
  },
}

export default recommendation
