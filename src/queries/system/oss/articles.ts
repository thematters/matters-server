import type { GQLOssResolvers } from 'definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from 'common/utils/index.js'

export const articles: GQLOssResolvers['articles'] = async (
  _,
  { input },
  { dataSources: { articleService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [items, totalCount] = await articleService.findAndCountArticles({
    take,
    skip,
    filter: { isSpam: input?.filter?.isSpam },
  })
  return connectionFromArray(items, input, totalCount)
}
