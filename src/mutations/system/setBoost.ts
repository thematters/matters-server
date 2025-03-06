import type { GQLMutationResolvers } from 'definitions/index.js'

import { EntityNotFoundError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'

const resolver: GQLMutationResolvers['setBoost'] = async (
  _,
  { input: { id, boost, type } },
  {
    dataSources: {
      userService,
      tagService,
      articleService,
      campaignService,
      atomService,
    },
  }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
    Campaign: campaignService,
  } as const

  const { id: dbId } = fromGlobalId(id)
  const entity = await atomService.findUnique({
    table: type.toLowerCase() as Lowercase<keyof typeof serviceMap>,
    where: { id: dbId },
  })
  if (!entity) {
    throw new EntityNotFoundError(`target ${type} does not exists`)
  }

  await serviceMap[type].setBoost({ id: dbId, boost })

  return {
    ...entity,
    __type: type === 'Campaign' ? 'WritingChallenge' : type,
    id: dbId,
  }
}

export default resolver
