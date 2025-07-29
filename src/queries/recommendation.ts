import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES, MATTERS_CHOICE_TOPIC_STATE } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { note } from './recommendation/icymiTopic/note.js'
import { title } from './recommendation/icymiTopic/title.js'

const recommendation: GQLResolvers = {
  IcymiTopic: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.IcymiTopic, id }),
    articles: async ({ articles }, _, { dataSources: { atomService } }) =>
      atomService.articleIdLoader.loadMany(articles),
    archivedAt: ({ updatedAt, state }) =>
      state === MATTERS_CHOICE_TOPIC_STATE.archived ? updatedAt : null,
    title,
    note,
  },
}

export default recommendation
