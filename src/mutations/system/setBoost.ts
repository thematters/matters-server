import type { GQLMutationResolvers } from 'definitions'

import { EntityNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['setBoost'] = async (
  _,
  { input: { id, boost, type } },
  { dataSources: { userService, tagService, articleService } }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
  }

  const { id: dbId } = fromGlobalId(id)
  const entity = await serviceMap[type].loadById(dbId)
  if (!entity) {
    throw new EntityNotFoundError(`target ${type} does not exists`)
  }

  await serviceMap[type].setBoost({ id: dbId, boost })

  return { ...entity, __type: type, id: dbId } as any
}

export default resolver
