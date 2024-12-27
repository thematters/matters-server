import type { GQLMutationResolvers } from 'definitions'

import { UserInputError, AuthenticationError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['setArticleChannels'] = async (
  _,
  { input: { id: globalId, channels: newChannelIds } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const articleId = fromGlobalId(globalId).id
  const channelIds = newChannelIds.map((id) => fromGlobalId(id).id)

  const article = await atomService.findUnique({
    table: 'article',
    where: { id: articleId },
  })
  if (!article) {
    throw new UserInputError('invalid article id')
  }

  // Get existing channels
  const existingChannels = await atomService.findMany({
    table: 'article_channel',
    where: { articleId },
  })
  const existingChannelIds = new Set(existingChannels.map((c) => c.channelId))

  // Diff channels
  const toAdd = channelIds.filter((id) => !existingChannelIds.has(id))
  const toRemove = [...existingChannelIds].filter(
    (id) => !channelIds.includes(id)
  )

  // Add new channels
  if (toAdd.length > 0) {
    for (const channelId of toAdd) {
      await atomService.create({
        table: 'article_channel',
        data: {
          articleId,
          channelId,
          enabled: true,
          isLabeled: true,
        },
      })
    }
  }

  // Disable removed channels
  if (toRemove.length > 0) {
    await atomService.updateMany({
      table: 'article_channel',
      where: { articleId },
      whereIn: ['channelId', toRemove],
      data: { enabled: false, isLabeled: true },
    })
  }

  return article
}

export default resolver
