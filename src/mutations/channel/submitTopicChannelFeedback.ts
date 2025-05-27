import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES, TOPIC_CHANNEL_FEEDBACK_TYPE } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['sumbitTopicChannelFeedback'] = async (
  _,
  { input: { article: articleGlobalId, channels: channelGlobalIds, type } },
  { viewer, dataSources: { channelService } }
) => {
  const { id: articleId, type: articleType } = fromGlobalId(articleGlobalId)
  if (articleType !== NODE_TYPES.Article) {
    throw new UserInputError('Invalid article type')
  }
  const channelIds =
    channelGlobalIds?.map((id) => fromGlobalId(id)).map(({ id }) => id) || []
  // Create feedback based on type
  const feedback =
    type === TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE
      ? await channelService.createPositiveFeedback({
          articleId,
          userId: viewer.id,
        })
      : await channelService.createNegativeFeedback({
          articleId,
          userId: viewer.id,
          channelIds,
        })

  return feedback
}

export default resolver
