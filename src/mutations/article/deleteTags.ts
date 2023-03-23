import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums/index.js'
import { fromGlobalId } from 'common/utils/index.js'
import { CacheService } from 'connectors/index.js'
import { MutationToDeleteTagsResolver } from 'definitions'

const resolver: MutationToDeleteTagsResolver = async (
  root,
  { input: { ids } },
  { viewer, dataSources: { atomService } }
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

  await Promise.all(
    tagIds.map((id: string) => atomService.deleteSearch({ table: 'tag', id }))
  )

  // manually invalidate cache since it returns nothing
  const cacheService = new CacheService()
  await Promise.all(
    tagIds.map((id) =>
      invalidateFQC({
        node: { type: NODE_TYPES.Tag, id },
        redis: cacheService.redis,
      })
    )
  )

  return true
}

export default resolver
