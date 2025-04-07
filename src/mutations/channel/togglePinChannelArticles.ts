import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['togglePinChannelArticles'] = async (
  _,
  { input: { channel: channelGlobalId, articles: articleGlobalIds, pinned } },
  { dataSources: { channelService } }
) => {
  // Validate and extract channel ID
  const { id: channelId, type: channelType } = fromGlobalId(channelGlobalId)
  if (
    ![NODE_TYPES.TopicChannel, NODE_TYPES.CurationChannel].includes(channelType)
  ) {
    throw new UserInputError('Invalid channel id')
  }

  // Validate and extract article IDs
  const articleIds = articleGlobalIds.map((globalId) => {
    const { id, type } = fromGlobalId(globalId)
    if (type !== NODE_TYPES.Article) {
      throw new UserInputError('Invalid article id')
    }
    return id
  })

  // Use channel service to handle pin/unpin logic
  const result = await channelService.togglePinChannelArticles({
    channelId,
    channelType: channelType as
      | NODE_TYPES.TopicChannel
      | NODE_TYPES.CurationChannel,
    articleIds,
    pinned,
  })

  return { ...result, __type: channelType }
}

export default resolver
