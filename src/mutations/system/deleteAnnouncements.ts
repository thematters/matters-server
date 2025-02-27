import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums'
import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

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
