import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { CollectionToArticlesResolver } from 'definitions'

const resolver: CollectionToArticlesResolver = async (
  { id: collectionId },
  { input: { first, after, reversed } },
  { dataSources: { draftService, collectionService } }
) => {
  if (!collectionId) {
    return connectionFromArray([], { first, after })
  }

  const { skip, take } = fromConnectionArgs({ first, after })
  const [articles, totalCount] =
    await collectionService.findAndCountArticlesInCollection(collectionId, {
      skip,
      take,
      reversed,
    })

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    { first, after },
    totalCount
  )
}

export default resolver
