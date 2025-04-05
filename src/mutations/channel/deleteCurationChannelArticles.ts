import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { EntityNotFoundError, UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['deleteCurationChannelArticles'] = async (
  _,
  { input: { channel: globalId, articles } },
  { dataSources: { atomService } }
) => {
  // Validate channel ID
  const { id: channelId, type } = fromGlobalId(globalId)
  if (type !== NODE_TYPES.CurationChannel) {
    throw new UserInputError('Invalid channel ID')
  }

  // Validate article IDs
  const articleTypes = articles.map((id) => fromGlobalId(id).type)
  if (articleTypes.some((articleType) => articleType !== NODE_TYPES.Article)) {
    throw new UserInputError('Invalid article IDs')
  }

  // Load channel to verify it exists
  const channel = await atomService.findFirst({
    table: 'curation_channel',
    where: { id: channelId },
  })

  if (!channel) {
    throw new EntityNotFoundError('Channel not found')
  }

  // Early return if no articles to delete
  if (articles.length === 0) {
    return channel
  }

  // Delete articles from channel
  await atomService.deleteMany({
    table: 'curation_channel_article',
    where: { channelId },
    whereIn: ['articleId', articles.map((id) => fromGlobalId(id).id)],
  })

  return channel
}

export default resolver
