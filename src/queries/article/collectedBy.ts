import { ARTICLE_STATE, BATCH_SIZE } from 'common/enums'
import {
  connectionFromPromisedArray,
  cursorToIndex,
  loadManyFilterError,
} from 'common/utils'
import { ArticleToCollectedByResolver } from 'definitions'

const resolver: ArticleToCollectedByResolver = async (
  { articleId },
  { input },
  { dataSources: { atomService, articleService, draftService }, knex }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1

  const [totalCountResult, collections] = await Promise.all([
    knex('collection')
      .where({ articleId })
      .countDistinct('entrance_id')
      .first(),
    atomService.findMany({
      table: 'collection',
      where: { articleId },
      skip: offset || 0,
      take: first || BATCH_SIZE,
    }),
  ])

  const totalCount = parseInt(
    totalCountResult ? (totalCountResult.count as string) : '0',
    10
  )

  const articles = await articleService.dataloader
    .loadMany(collections.map((collection) => collection.entranceId))
    .then(loadManyFilterError)
    .then((items) =>
      items.filter(({ state }) => state === ARTICLE_STATE.active)
    )

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}

export default resolver
