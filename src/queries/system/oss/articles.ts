import type { GQLOssResolvers } from '#definitions/index.js'

import {
  connectionFromQuery,
  connectionFromArray,
} from '#common/utils/connections.js'
import { fromGlobalId } from '#common/utils/index.js'

export const articles: GQLOssResolvers['articles'] = async (
  _,
  { input },
  { dataSources: { articleService, systemService, channelService } }
) => {
  const spamThreshold = await systemService.getSpamThreshold()

  // return channel articles
  if (input?.filter?.channel) {
    const { type, id } = fromGlobalId(input.filter.channel)
    if (type === 'TopicChannel') {
      const channelQuery = channelService.findTopicChannelArticles(id, {
        spamThreshold: spamThreshold ?? undefined,
      })
      return connectionFromQuery({
        query: channelQuery,
        args: input,
        orderBy: { column: 'order', order: 'asc' },
        cursorColumn: 'id',
      })
    }
    // return empty array for invalid channel type
    return connectionFromArray([], input)
  }

  // return spam articles
  if (input?.filter?.isSpam) {
    const query = articleService.findArticles({
      isSpam: input?.filter?.isSpam ?? false,
      spamThreshold: spamThreshold ?? 0,
    })

    return connectionFromQuery({
      query,
      args: input,
      orderBy: { column: 'updatedAt', order: 'desc' },
      cursorColumn: 'id',
    })
  }

  return connectionFromQuery({
    query: articleService.findArticles(),
    args: input,
    orderBy: { column: 'updatedAt', order: 'desc' },
    cursorColumn: 'id',
  })
}
