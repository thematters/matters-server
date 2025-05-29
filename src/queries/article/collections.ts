import type { GQLArticleResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

const resolver: GQLArticleResolvers['collections'] = async (
  { id },
  { input },
  { dataSources: { collectionService } }
) => {
  return connectionFromQuery({
    query: collectionService.findByArticle(id),
    orderBy: {
      column: 'id',
      order: 'desc',
    },
    args: input,
  })
}

export default resolver
