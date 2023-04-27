import { NODE_TYPES } from 'common/enums'
import { fromGlobalId, isTarget, toGlobalId } from 'common/utils'
import { OfficialToAnnouncementsResolver } from 'definitions'

export const announcements: OfficialToAnnouncementsResolver = async (
  root,
  { input: { id, visible } },
  { dataSources: { atomService, systemService }, req, viewer }
) => {
  const isAdmin = viewer.hasRole('admin')
  const visibleFilter = !isAdmin
    ? { visible: true }
    : typeof visible === 'boolean'
    ? { visible }
    : {}

  const { id: dbId } = id ? fromGlobalId(id) : { id: null }
  const records = await atomService.findMany({
    table: 'announcement',
    where: {
      ...(dbId ? { id: dbId } : {}),
      ...visibleFilter,
    },
    // ...(dbId ? { where: { id: dbId } } : {}),
    orderBy: [{ column: 'createdAt', order: 'desc' }],
  })

  // re-format announcements
  const items = await Promise.all(
    records.map(async (record) => {
      const cover = record?.cover
        ? systemService.findAssetUrl(record.cover, !isTarget(req, viewer))
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
