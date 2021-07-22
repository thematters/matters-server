import { ARTICLE_STATE } from 'common/enums'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  loadManyFilterError,
} from 'common/utils'
import { ArticleToCollectedByResolver } from 'definitions'

const resolver: ArticleToCollectedByResolver = async (
  { articleId },
  { input },
  { dataSources: { atomService, articleService, draftService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [countRecord, collections] = await Promise.all([
    knex('collection')
      .where({ articleId })
      .countDistinct('entrance_id')
      .first(),
    atomService.findMany({
      table: 'collection',
      where: { articleId },
      skip,
      take,
    }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
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
