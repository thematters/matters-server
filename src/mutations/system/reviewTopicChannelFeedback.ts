import type { GQLMutationResolvers } from '#definitions/index.js'

import { NOTICE_TYPE } from '#common/enums/notification.js'
import { UserInputError, EntityNotFoundError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['reviewTopicChannelFeedback'] = async (
  _,
  { input: { feedback: feebackGlobalId, action } },
  { dataSources: { atomService, channelService, notificationService } }
) => {
  const { id, type } = fromGlobalId(feebackGlobalId)

  if (type !== 'TopicChannelFeedback') {
    throw new UserInputError('Invalid feedback id')
  }

  const feedback = await atomService.findUnique({
    table: 'topic_channel_feedback',
    where: { id },
  })
  if (!feedback) {
    throw new EntityNotFoundError('TopicChannelFeedback not found')
  }

  if (action === 'accept') {
    const accepted = await channelService.acceptFeedback(feedback)
    notificationService.trigger({
      event: NOTICE_TYPE.topic_channel_feedback_accepted,
      recipientId: feedback.userId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: await atomService.articleIdLoader.load(feedback.articleId),
        },
      ],
    })
    return accepted
  } else if (action === 'reject') {
    return channelService.rejectFeedback(feedback)
  }
  throw new UserInputError('Invalid action')
}

export default resolver
