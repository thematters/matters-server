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
  { dataSources: { articleService } }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countCollections(articleId)
  const collections = await articleService.findCollections({
    entranceId: articleId,
    limit: first,
    offset,
  })

  return connectionFromPromisedArray(
    articleService.linkedDraftLoader
      .loadMany(
        collections.map(({ articleId: id }: { articleId: string }) => id)
      )
      .then(loadManyFilterError),
    input,
    totalCount
  )
}

export default resolver
