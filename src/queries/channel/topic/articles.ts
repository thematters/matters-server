import type { GQLTopicChannelResolvers } from '#definitions/index.js'

import { DEFAULT_TAKE_PER_PAGE } from '#common/enums/index.js'
import { connectionFromQuery } from '#common/utils/connections.js'

const resolver: GQLTopicChannelResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { channelService, atomService, systemService } }
) => {
  const channelThreshold = await systemService.getArticleChannelThreshold()
  const spamThreshold = await systemService.getSpamThreshold()

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50

  const baseQuery = channelService.findTopicChannelArticles(id, {
    channelThreshold: channelThreshold ?? undefined,
    spamThreshold: spamThreshold ?? undefined,
    datetimeRange: input.filter?.dateTimeRange,
  })

  const connection = await connectionFromQuery({
    query: baseQuery,
    args: input,
    orderBy: { column: 'order', order: 'asc' },
    cursorColumn: 'id',
    maxTake: MAX_ITEM_COUNT,
  })

  return {
    ...connection,
    edges: await Promise.all(
      connection.edges.map(async (edge) => {
        const article = await atomService.findFirst({
          table: 'topic_channel_article',
          where: { articleId: edge.node.id, channelId: id },
        })
        return {
          ...edge,
          pinned: article.pinned,
        }
      })
    ),
  }
}

export default resolver
