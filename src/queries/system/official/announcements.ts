import { NODE_TYPES } from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { OfficialToAnnouncementsResolver } from 'definitions'

export const announcements: OfficialToAnnouncementsResolver = async (
  root,
  { input: { id } },
  { dataSources: { atomService, systemService } }
) => {
  const { id: dbId } = id ? fromGlobalId(id) : { id: null }
  const records = await atomService.findMany({
    table: 'announcement',
    ...(dbId ? { where: { id: dbId } } : {}),
    orderBy: [{ column: 'createdAt', order: 'desc' }],
  })

  // re-format announcements
  const items = await Promise.all(
    records.map(async (record) => {
      const cover = record?.cover
        ? systemService.findAssetUrl(record.cover)
        : null
      return {
        ...record,
        id: toGlobalId({ type: NODE_TYPES.Announcement, id: record.id }),
        cover,
      }
    })
  )
  return items
}
