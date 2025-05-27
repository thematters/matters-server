import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { TOPIC_CHANNEL_FEEDBACK_STATE } from '#root/src/common/enums/index.js'

const resolver: GQLMutationResolvers['setArticleTopicChannels'] = async (
  _,
  { input: { id: globalId, channels: newChannelIds } },
  { dataSources: { atomService, channelService } }
) => {
  const articleId = fromGlobalId(globalId).id
  const channelIds = newChannelIds.map((id) => fromGlobalId(id).id)

  const article = await atomService.findUnique({
    table: 'article',
    where: { id: articleId },
  })
  if (!article) {
    throw new UserInputError('Invalid article id')
  }

  await channelService.setArticleTopicChannels({
    articleId,
    channelIds,
  })

  const feedback = await atomService.findFirst({
    table: 'topic_channel_feedback',
    where: { articleId },
  })
  if (
    feedback &&
    (await channelService.isFeedbackResolved({
      articleId,
      channelIds: feedback.channelIds,
    }))
  ) {
    await atomService.update({
      table: 'topic_channel_feedback',
      where: { id: feedback.id },
      data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED },
    })
  }

  return article
}

export default resolver
