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
  { dataSources: { articleService, draftService } }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, collections] = await Promise.all([
    articleService.countCollectedBy(articleId),
    articleService.findCollectedBy({ articleId, limit: first, offset }),
  ])
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
