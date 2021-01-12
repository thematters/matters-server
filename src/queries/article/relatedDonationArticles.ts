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
  { dataSources: { articleService, draftService } }
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
    const filteredArticles = (chunks[index] || []) as any[]

    return connectionFromPromisedArray(
      draftService.dataloader.loadMany(
        filteredArticles.map((article) => article.draftId)
      ),
      input,
      articlePool.length
    )
  }

  const offset = cursorToIndex(after) + 1
  const [totalCount, articles] = await Promise.all([
    articleService.countRelatedDonations({ articleId, notIn }),
    articleService.findRelatedDonations({
      articleId,
      offset,
      notIn,
      limit: first,
    }),
  ])

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}

export default resolver
