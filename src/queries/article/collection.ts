import { ARTICLE_STATE } from 'common/enums'
import {
  connectionFromPromisedArray,
  cursorToIndex,
  loadManyFilterError,
} from 'common/utils'
import { ArticleToCollectionResolver } from 'definitions'

const resolver: ArticleToCollectionResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService }, knex }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const [countRecord, collections] = await Promise.all([
    knex('collection')
      .countDistinct('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId: articleId, state: ARTICLE_STATE.active })
      .first(),
    articleService.findCollections({
      entranceId: articleId,
      limit: first,
      offset,
    }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    articleService.draftLoader
      .loadMany(collections.map((collection) => collection.articleId))
      .then(loadManyFilterError),
    input,
    totalCount
  )
}

export default resolver
