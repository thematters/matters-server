import type { GQLOfficialResolvers, Announcement } from '#definitions/index.js'

import { fromGlobalId } from '#common/utils/index.js'

export const announcements: GQLOfficialResolvers['announcements'] = async (
  _,
  { input: { id: GlobalId, channel: channelInput, visible } },
  { dataSources: { systemService, atomService }, viewer }
) => {
  const isAdmin = viewer.hasRole('admin')
  visible = !isAdmin ? true : visible

  const { id } = GlobalId ? fromGlobalId(GlobalId) : {}

  let records: Announcement[] = []
  if (id) {
    const record = await systemService.findAnnouncement({ id, visible })
    records = record ? [record] : []
  } else {
    let channelId = undefined
    if (channelInput?.id) {
      channelId = fromGlobalId(channelInput.id).id
    } else if (channelInput?.shortHash) {
      const channel = await atomService.findUnique({
        table: 'topic_channel',
        where: { shortHash: channelInput.shortHash },
      })
      channelId = channel?.id
    }
    records = await systemService.findAnnouncements({ channelId, visible })
  }

  // re-format announcements
  const items = await Promise.all(
    records.map(async (record) => {
      const cover = record?.cover
        ? await systemService.findAssetUrl(record.cover)
        : ''
      return {
        ...record,
        cover,
      }
    })
  )
  return items
}
