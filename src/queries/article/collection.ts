import { ARTICLE_STATE } from 'common/enums/index.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  loadManyFilterError,
} from 'common/utils/index.js'
import { ArticleToCollectionResolver, Item } from 'definitions'

const resolver: ArticleToCollectionResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input, { allowTakeAll: true })

  const [countRecord, collections] = await Promise.all([
    knex('collection')
      .countDistinct('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId: articleId, state: ARTICLE_STATE.active })
      .first(),
    articleService.findCollections({
      entranceId: articleId,
      take,
      skip,
    }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    articleService.draftLoader
      .loadMany(collections.map((collection: Item) => collection.articleId))
      .then(loadManyFilterError),
    input,
    totalCount
  )
}

export default resolver
