import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['deleteAnnouncements'] = async (
  _,
  { input: { ids } },
  { dataSources: { atomService, connections } }
) => {
  const table = 'announcement'

  if (!ids || ids.length === 0) {
    throw new UserInputError('required paramter missing: ids')
  }

  const itemIds = ids.map((id) => fromGlobalId(id).id)

  await atomService.deleteMany({
    table: 'announcement_translation',
    whereIn: ['announcement_id', itemIds],
  })

  await atomService.deleteMany({
    table,
    whereIn: ['id', itemIds],
  })

  // purge deleted announcements
  await Promise.all(
    itemIds.map((id) =>
      invalidateFQC({
        node: { type: NODE_TYPES.Announcement, id },
        redis: connections.redis,
      })
    )
  )

  return true
}

export default resolver
