import type { GQLTopicChannelFeedbackResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

const resolver: GQLTopicChannelFeedbackResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.TopicChannelFeedback, id }),
  type: ({ type }) => type,
  state: ({ state }) => state,
  article: async ({ articleId }, _, { dataSources: { atomService } }) =>
    atomService.articleIdLoader.load(articleId),
  channels: async ({ channelIds }, _, { dataSources: { atomService } }) =>
    atomService.findMany({
      table: 'topic_channel',
      whereIn: ['id', channelIds],
    }),
}

export default resolver
