import type { GQLCurationChannelResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/connections.js'

const resolver: GQLCurationChannelResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { channelService } }
) => {
  return connectionFromQuery({
    query: channelService.findCurationChannelArticles(id),
    args: input,
    orderBy: { column: 'order', order: 'asc' },
    cursorColumn: 'id',
  }) as any
}

export default resolver
