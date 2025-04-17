import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/connections.js'

export const articles: GQLOssResolvers['articles'] = async (
  _,
  { input },
  { dataSources: { articleService, systemService } }
) => {
  const spamThreshold = await systemService.getSpamThreshold()

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
