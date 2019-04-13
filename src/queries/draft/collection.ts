import { DraftToCollectionResolver } from 'definitions'
import { connectionFromPromisedArray, connectionFromArray } from 'common/utils'

const resolver: DraftToCollectionResolver = (
  { collection },
  { input },
  { dataSources: { articleService } }
) => {
  if (!collection || collection.length === 0) {
    return connectionFromArray([], input)
  }

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(collection),
    input
  )
}

export default resolver
