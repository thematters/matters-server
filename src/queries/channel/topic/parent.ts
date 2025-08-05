import type { GQLTopicChannelResolvers } from '#definitions/index.js'

const resolver: GQLTopicChannelResolvers['parent'] = async (
  { parentId },
  _,
  { dataSources: { atomService } }
) => {
  if (!parentId) return null
  return atomService.findUnique({
    table: 'topic_channel',
    where: { id: parentId },
  })
}

export default resolver
