import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/connections.js'

export const articles: GQLOssResolvers['articles'] = async (
  _,
  { input },
  { dataSources: { articleService, systemService } }
) => {
  const spamThreshold = await systemService.getSpamThreshold()
  return connectionFromQuery({
    query: articleService.findArticles({
      filter: {
        isSpam: input?.filter?.isSpam ?? false,
        spamThreshold: spamThreshold ?? 0.5,
      },
    }),
    args: input,
    orderBy: { column: 'id', order: 'desc' },
    cursorColumn: 'id',
  })
}
