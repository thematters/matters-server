import { DraftToCollectionResolver } from 'definitions'
import { connectionFromPromisedArray } from 'common/utils'

const resolver: DraftToCollectionResolver = (
  { collection },
  { input },
  { dataSources: { articleService } }
) => {
  if (!collection || collection.length === 0) {
    return []
  }

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(collection),
    input
  )
}

export default resolver
