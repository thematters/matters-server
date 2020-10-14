import { ARTICLE_STATE } from 'common/enums'
import {
  connectionFromPromisedArray,
  cursorToIndex,
  loadManyFilterError,
} from 'common/utils'
import { ArticleToCollectedByResolver } from 'definitions'

const resolver: ArticleToCollectedByResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService } }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countCollectedBy(articleId)
  const collections = await articleService.findCollectedBy({
    articleId,
    limit: first,
    offset,
  })

  return connectionFromPromisedArray(
    articleService.dataloader
      .loadMany(
        collections.map(({ entranceId }: { entranceId: string }) => entranceId)
      )
      .then(loadManyFilterError)
      .then((articles) =>
        articles.filter(({ state }) => state === ARTICLE_STATE.active)
      ),
    input,
    totalCount
  )
}

export default resolver
