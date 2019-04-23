import { get } from 'lodash'
import { MutationToSetCollectionResolver } from 'definitions'
import { PARTNERS } from 'common/enums'
import { EntityNotFoundError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetCollectionResolver = async (
  root,
  { input: { id, collection } },
  { viewer, dataSources: { articleService } }
) => {
  const userName = get(viewer, 'userName')
  const isPartner = PARTNERS.includes(userName)

  if (!viewer.hasRole('admin') && !isPartner) {
    throw new ForbiddenError('viewer has no permission')
  }

  const entranceId = fromGlobalId(id).id
  const article = await articleService.baseFindById(entranceId)
  if (!article) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (isPartner && article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const articleIds = collection.map(id => fromGlobalId(id).id)

  // Clean all existing collection and then insert
  await articleService.deleteCollection({ entranceId })
  await articleService.createCollection({ entranceId, articleIds })

  return articleService.dataloader.load(entranceId)
}

export default resolver
