import type { GQLArticleResolvers } from 'definitions'

import { chunk } from 'lodash'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLArticleResolvers['relatedDonationArticles'] = async (
  { id: articleId },
  { input },
  { dataSources: { articleService } }
) => {
  const { random } = input
  const { take, skip } = fromConnectionArgs(input)

  const notIn = [articleId]

  /**
   * Pick randomly
   */
  if (typeof random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = input.first || 5

    const articlePool = await articleService.findRelatedDonations({
      articleId,
      notIn,
      take: MAX_RANDOM_INDEX * randomDraw,
    })

    const chunks = chunk(articlePool, randomDraw)
    const index = Math.min(random, MAX_RANDOM_INDEX, chunks.length - 1)
    const filteredArticles = chunks[index] || []

    return connectionFromPromisedArray(
      filteredArticles,
      input,
      articlePool.length
    )
  }

  const [totalCount, articles] = await Promise.all([
    articleService.countRelatedDonations({ articleId, notIn }),
    articleService.findRelatedDonations({
      articleId,
      notIn,
      take,
      skip,
    }),
  ])

  return connectionFromPromisedArray(articles, input, totalCount)
}

export default resolver
