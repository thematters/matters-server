import type { GQLCurationChannelResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/connections.js'

const resolver: GQLCurationChannelResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { channelService, atomService } }
) => {
  const connection = await connectionFromQuery({
    query: channelService.findCurationChannelArticles(id),
    args: input,
    orderBy: { column: 'order', order: 'asc' },
    cursorColumn: 'id',
  })

  return {
    ...connection,
    edges: await Promise.all(
      connection.edges.map(async (edge) => {
        const article = await atomService.findFirst({
          table: 'curation_channel_article',
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
