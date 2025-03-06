import type { GQLTagResolvers } from '#definitions/index.js'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'

const resolver: GQLTagResolvers['articles'] = async (
  root,
  { input },
  { dataSources: { tagService, atomService } }
) => {
  const { sortBy } = input
  const { take, skip } = fromConnectionArgs(input)
  const isHottest = sortBy === 'byHottestDesc'

  const [totalCount, articleIds] = await Promise.all([
    isHottest
      ? tagService.countHottestArticles({ id: root.id })
      : tagService.countArticles({ id: root.id }),
    isHottest
      ? tagService.findHottestArticleIds({
          id: root.id,
          skip,
          take,
        })
      : tagService.findArticleIds({
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
