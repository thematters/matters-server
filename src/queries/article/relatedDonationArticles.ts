import { chunk } from 'lodash'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { ArticleToRelatedDonationArticlesResolver } from 'definitions'

const resolver: ArticleToRelatedDonationArticlesResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService } }
) => {
  const { first, after, random } = input

  const notIn = [articleId]

  /**
   * Pick randomly
   */
  if (typeof random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = first || 5

    const articlePool = await articleService.findRelatedDonations({
      articleId,
      notIn,
      limit: MAX_RANDOM_INDEX * randomDraw,
    })

    const chunks = chunk(articlePool, randomDraw)
    const index = Math.min(random, MAX_RANDOM_INDEX, chunks.length - 1)
    const filteredArticles = chunks[index] || []

    return connectionFromArray(filteredArticles, input, articlePool.length)
  }

  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countRelatedDonations({
    articleId,
    notIn,
  })

  return connectionFromPromisedArray(
    articleService.findRelatedDonations({
      articleId,
      offset,
      notIn,
      limit: first,
    }),
    input,
    // @ts-ignore
    totalCount
  )
}

export default resolver
