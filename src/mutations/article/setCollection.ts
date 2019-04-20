import { MutationToSetCollectionResolver } from 'definitions'
import { ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetCollectionResolver = async (
  root,
  { input: { id, collection } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  const entranceId = fromGlobalId(id).id
  const articleIds = collection.map(id => fromGlobalId(id).id)

  // Clean all existing collection and then insert
  await articleService.deleteCollection({ entranceId })
  await articleService.createCollection({ entranceId, articleIds })

  return articleService.dataloader.load(entranceId)
}

export default resolver
