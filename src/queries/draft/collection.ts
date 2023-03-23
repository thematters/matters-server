import {
  connectionFromArray,
  connectionFromPromisedArray,
} from 'common/utils/index.js'
import { DraftToCollectionResolver } from 'definitions'

const resolver: DraftToCollectionResolver = (
  { collection },
  { input },
  { dataSources: { articleService } }
) => {
  if (!collection || collection.length === 0) {
    return connectionFromArray([], input)
  }

  return connectionFromPromisedArray(
    articleService.draftLoader.loadMany(collection),
    input
  )
}

export default resolver
