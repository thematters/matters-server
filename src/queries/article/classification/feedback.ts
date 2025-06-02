import type { GQLTopicChannelClassificationResolvers } from '#definitions/index.js'

const resolver: GQLTopicChannelClassificationResolvers['feedback'] = async (
  { id: articleId, authorId },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (viewer.id !== authorId && !viewer.hasRole('admin')) {
    return null
  }

  return atomService.findFirst({
    table: 'topic_channel_feedback',
    where: { articleId },
  })
}

export default resolver
