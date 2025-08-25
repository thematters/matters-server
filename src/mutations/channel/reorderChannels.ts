import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['reorderChannels'] = async (
  _,
  { input: { ids: globalIds } },
  {
    dataSources: {
      channelService,
      connections: { redis },
    },
  }
) => {
  const _globalIds = globalIds.map((globalId) => {
    const { type, id } = fromGlobalId(globalId)
    if (
      ![
        NODE_TYPES.TopicChannel,
        NODE_TYPES.CurationChannel,
        NODE_TYPES.Campaign,
        NODE_TYPES.Tag,
      ].includes(type)
    ) {
      throw new UserInputError(`Invalid channel type: ${type}`)
    }
    return { type, id }
  })
  // Update order for each channel
  await Promise.all(
    _globalIds.map(async ({ type, id }, index) => {
      await channelService.updateChannelOrder({ type, id }, index)

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
        case NODE_TYPES.Tag:
          invalidateFQC({ node: { type: NODE_TYPES.Tag, id }, redis })
          break
      }
    })
  )

  return true
}

export default resolver
