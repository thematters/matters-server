import type { GQLTopicChannelClassificationResolvers } from '#definitions/index.js'

const resolver: GQLTopicChannelClassificationResolvers['feedback'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.findFirst({
    table: 'topic_channel_feedback',
    where: { articleId },
  })

export default resolver
