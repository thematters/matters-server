import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

export const topicChannelFeedbacks: GQLOssResolvers['topicChannelFeedbacks'] =
  async (_, { input }, { dataSources: { channelService, systemService } }) => {
    const { type, state, spam } = input.filter ?? {}

    const spamThreshold =
      spam === false ? await systemService.getSpamThreshold() : null

    return connectionFromQuery({
      query: channelService.findFeedbacks({ type, state, spamThreshold }),
      orderBy: { column: 'id', order: 'desc' },
      args: input,
    })
  }
