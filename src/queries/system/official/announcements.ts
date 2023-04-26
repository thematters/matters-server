import { NODE_TYPES } from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { OfficialToAnnouncementsResolver } from 'definitions'

export const announcements: OfficialToAnnouncementsResolver = async (
  root,
  { input: { id, visible } },
  { dataSources: { atomService, systemService }, viewer, req }
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

  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.Origin as string)
  // re-format announcements
  const items = await Promise.all(
    records.map(async (record) => {
      const cover = record?.cover
        ? systemService.findAssetUrl(record.cover, useS3)
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
