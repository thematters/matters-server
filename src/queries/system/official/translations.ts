import type { GQLAnnouncementResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'

export const translations: GQLAnnouncementResolvers['translations'] = async (
  { id },
  _,
  { dataSources: { atomService, systemService } }
) => {
  const { id: dbId } = id ? fromGlobalId(id) : { id: null }
  const records = await atomService.findMany({
    table: 'announcement_translation',
    where: {
      ...(dbId ? { announcementId: dbId } : {}),
    },
    orderBy: [{ column: 'createdAt', order: 'desc' }],
  })

  // re-format announcements
  const items = await Promise.all(
    records.map(async (record) => {
      const cover = record?.cover
        ? await systemService.findAssetUrl(record.cover)
        : null
      return {
        ...record,
        id: toGlobalId({ type: NODE_TYPES.Announcement, id: record.id }),
        cover,
      }
    })
  )
  return items as any
}
