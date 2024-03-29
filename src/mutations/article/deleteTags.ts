import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['deleteTags'] = async (
  _,
  { input: { ids } },
  {
    dataSources: {
      atomService,
      connections: { redis },
    },
  }
) => {
  const tagIds = ids.map((id) => fromGlobalId(id).id)

  // delete article tags
  await atomService.deleteMany({
    table: 'article_tag',
    whereIn: ['tag_id', tagIds],
  })

  // delete action tags
  await atomService.deleteMany({
    table: 'action_tag',
    where: { action: 'follow' },
    whereIn: ['target_id', tagIds],
  })

  // delete tags
  await atomService.deleteMany({ table: 'tag', whereIn: ['id', tagIds] })

  // manually invalidate cache since it returns nothing
  await Promise.all(
    tagIds.map((id) =>
      invalidateFQC({
        node: { type: NODE_TYPES.Tag, id },
        redis,
      })
    )
  )

  return true
}

export default resolver
