import type { GQLAnnouncementResolvers } from '#definitions/index.js'

export const translations: GQLAnnouncementResolvers['translations'] = async (
  { id },
  _,
  { dataSources: { atomService, systemService } }
) => {
  const records = await atomService.findMany({
    table: 'announcement_translation',
    where: {
      announcementId: id,
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
        cover,
      }
    })
  )
  return items as any
}
