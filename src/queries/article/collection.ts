import { ARTICLE_STATE } from 'common/enums'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToCollectionResolver } from 'definitions'

const resolver: ArticleToCollectionResolver = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countCollections(id)
  const collections = await articleService.findCollections({
    entranceId: id,
    limit: first,
    offset
  })

  return connectionFromPromisedArray(
    articleService.dataloader
      .loadMany(
        collections.map(({ articleId }: { articleId: string }) => articleId)
      )
      .then(articles =>
        articles.filter(({ state }) => state === ARTICLE_STATE.active)
      ),
    input,
    totalCount
  )
}

export default resolver
