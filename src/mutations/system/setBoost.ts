import type { GQLMutationResolvers } from 'definitions'

import { EntityNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['setBoost'] = async (
  root,
  { input: { id, boost, type } },
  { viewer, dataSources: { userService, tagService, articleService } }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
  }

  const { id: dbId } = fromGlobalId(id)
  const entity = await serviceMap[type].dataloader.load(dbId)
  if (!entity) {
    throw new EntityNotFoundError(`target ${type} does not exists`)
  }

  await serviceMap[type].setBoost({ id: dbId, boost })

  return { ...entity, __type: type }
}

export default resolver
