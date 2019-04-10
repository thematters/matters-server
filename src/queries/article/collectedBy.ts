import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToCollectedByResolver } from 'definitions'

const resolver: ArticleToCollectedByResolver = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { after, first } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countCollectedBy(id)
  const collections = await articleService.findCollectedBy({
    articleId: id,
    limit: first,
    offset
  })

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(
      collections.map(({ entranceId }: { entranceId: string }) => entranceId)
    ),
    input,
    totalCount
  )
}

export default resolver
