import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
  loadManyFilterError,
} from 'common/utils'
import { CollectionToArticlesResolver } from 'definitions'

const resolver: CollectionToArticlesResolver = async (
  { id: collectionId },
  { input: { first, after, reversed } },
  { dataSources: { articleService, draftService, collectionService } }
) => {
  if (!collectionId) {
    return connectionFromArray([], { first, after })
  }

  const { skip, take } = fromConnectionArgs({ first, after })
  const [articleIds, totalCount] =
    await collectionService.findAndCountArticlesInCollection(collectionId, {
      skip,
      take,
      reversed,
    })

  const articles = await articleService.dataloader
    .loadMany(articleIds.map(({ articleId }) => articleId))
    .then(loadManyFilterError)

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    { first, after },
    totalCount
  )
}

export default resolver
