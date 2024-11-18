import type { GQLTagResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLTagResolvers['articlesExcludeSpam'] = async (
  root,
  { input },
  { dataSources: { tagService, atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, articleIds] = await Promise.all([
    tagService.countArticles({
      id: root.id,
    }),
    tagService.findArticleIds({
      id: root.id,
      excludeSpam: true,
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
