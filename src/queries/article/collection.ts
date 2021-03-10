import {
  connectionFromPromisedArray,
  cursorToIndex,
  loadManyFilterError,
} from 'common/utils'
import { ArticleToCollectionResolver } from 'definitions'

const resolver: ArticleToCollectionResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService } }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, collections] = await Promise.all([
    articleService.countCollections(articleId),
    articleService.findCollections({
      entranceId: articleId,
      limit: first,
      offset,
    }),
  ])

  return connectionFromPromisedArray(
    articleService.draftLoader
      .loadMany(collections.map((collection) => collection.articleId))
      .then(loadManyFilterError),
    input,
    totalCount
  )
}

export default resolver
