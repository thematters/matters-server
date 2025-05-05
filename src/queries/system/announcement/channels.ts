import type { GQLAnnouncementResolvers } from '#definitions/index.js'
const resolver: GQLAnnouncementResolvers['channels'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const channelAnnouncements = await atomService.findMany({
    table: 'channel_announcement',
    where: { announcementId: id },
  })

  if (!channelAnnouncements.length) {
    return []
  }

  return channelAnnouncements.map(async (relation) => ({
    channel: {
      ...(await atomService.findUnique({
        table: 'topic_channel',
        where: { id: relation.channelId },
      })),
      __type: 'TopicChannel',
    },
    order: relation.order,
    visible: relation.visible,
  }))
}

export default resolver
