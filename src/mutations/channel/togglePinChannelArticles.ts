import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['togglePinChannelArticles'] = async (
  _,
  { input: { channels: channelGlobalIds, articles: articleGlobalIds, pinned } },
  { dataSources: { channelService } }
) => {
  // Validate and extract article IDs
  const articleIds = articleGlobalIds.map((globalId) => {
    const { id, type } = fromGlobalId(globalId)
    if (type !== NODE_TYPES.Article) {
      throw new UserInputError('Invalid article ID')
    }
    return id
  })

  return Promise.all(
    channelGlobalIds.map(async (globalId) => {
      const { id, type } = fromGlobalId(globalId)
      if (
        ![
          NODE_TYPES.TopicChannel,
          NODE_TYPES.CurationChannel,
          NODE_TYPES.Tag,
        ].includes(type)
      ) {
        throw new UserInputError('Invalid channel ID')
      }
      const channel =
        type === NODE_TYPES.TopicChannel
          ? await channelService.togglePinTopicChannelArticles({
              channelId: id,
              articleIds,
              pinned,
            })
          : type === NODE_TYPES.CurationChannel
          ? await channelService.togglePinCurationChannelArticles({
              channelId: id,
              articleIds,
              pinned,
            })
          : await channelService.togglePinTagArticles({
              tagId: id,
              articleIds,
              pinned,
            })
      return { ...channel, __type: type }
    })
  )
}

export default resolver
