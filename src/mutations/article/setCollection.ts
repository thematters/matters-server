import { MutationToSetCollectionResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetCollectionResolver = async (
  root,
  { input: { id, collection } },
  { viewer, dataSources: { articleService } }
) => {
  const entranceId = fromGlobalId(id).id
  const articleIds = collection.map(id => fromGlobalId(id).id)

  // Clean all existing collection and then insert
  await articleService.deleteCollection({ entranceId })
  await articleService.createCollection({ entranceId, articleIds })

  return articleService.dataloader.load(entranceId)
}

export default resolver
