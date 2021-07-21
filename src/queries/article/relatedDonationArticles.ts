import { chunk } from 'lodash'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { ArticleToRelatedDonationArticlesResolver } from 'definitions'

const resolver: ArticleToRelatedDonationArticlesResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService, draftService } }
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
      draftService.dataloader.loadMany(
        filteredArticles.map((article) => article.draftId)
      ),
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

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}

export default resolver
