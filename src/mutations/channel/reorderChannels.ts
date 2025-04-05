import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['reorderChannels'] = async (
  _,
  { input: { ids } },
  {
    dataSources: {
      channelService,
      connections: { redis },
    },
  }
) => {
  // Update order for each channel
  await Promise.all(
    ids.map(async (globalId, index) => {
      const { type, id } = fromGlobalId(globalId)

      // Validate type is one of the allowed channel types
      if (
        ![
          NODE_TYPES.TopicChannel,
          NODE_TYPES.CurationChannel,
          NODE_TYPES.Campaign,
        ].includes(type)
      ) {
        throw new UserInputError(`Invalid channel type: ${type}`)
      }

      switch (type) {
        case NODE_TYPES.TopicChannel:
          invalidateFQC({ node: { type: NODE_TYPES.TopicChannel, id }, redis })
          break
        case NODE_TYPES.CurationChannel:
          invalidateFQC({
            node: { type: NODE_TYPES.CurationChannel, id },
            redis,
          })
          break
        case NODE_TYPES.Campaign:
          invalidateFQC({ node: { type: NODE_TYPES.Campaign, id }, redis })
          break
      }

      await channelService.updateChannelOrder({ type, id }, index)
    })
  )

  return true
}

export default resolver
