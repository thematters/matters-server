import type { GQLTagChannelResolvers } from '#definitions/index.js'

import { connectionFromQueryOffsetBased } from '#common/utils/index.js'

const resolver: GQLTagChannelResolvers['moments'] = async (
  { tagId },
  { input },
  { dataSources: { tagService, systemService } }
) => {
  const spamThreshold = (await systemService.getSpamThreshold()) ?? undefined

  return connectionFromQueryOffsetBased({
    query: tagService.findMoments({ id: tagId, spamThreshold }),
    args: input,
    orderBy: [
      { column: 'createdAt', order: 'desc' },
      { column: 'id', order: 'desc' },
    ],
  })
}

export default resolver
