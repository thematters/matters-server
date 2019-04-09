import { DraftToCollectionResolver } from 'definitions'

const resolver: DraftToCollectionResolver = (
  { collection },
  _,
  { dataSources: { articleService } }
) => {
  if (!collection || collection.length === 0) {
    return []
  }

  return articleService.dataloader.loadMany(collection)
}

export default resolver
