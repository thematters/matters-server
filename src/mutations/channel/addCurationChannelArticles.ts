import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import {
  UserInputError,
  EntityNotFoundError,
  ArticleNotFoundError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import uniq from 'lodash/uniq.js'

const resolver: GQLMutationResolvers['addCurationChannelArticles'] = async (
  _,
  { input: { channel: channelGlobalId, articles: articleGlobalIds } },
  { dataSources: { channelService, atomService } }
) => {
  // Validate and extract channel ID
  const { id: channelId, type: channelType } = fromGlobalId(channelGlobalId)
  if (channelType !== NODE_TYPES.CurationChannel) {
    throw new UserInputError('invalid channel id')
  }

  // Check if channel exists
  const channel = await atomService.findUnique({
    table: 'curation_channel',
    where: { id: channelId },
  })
  if (!channel) {
    throw new EntityNotFoundError('channel not found')
  }

  // Validate and extract article IDs
  const articleIds = uniq(articleGlobalIds).map((globalId) => {
    const { id, type } = fromGlobalId(globalId)
    if (type !== NODE_TYPES.Article) {
      throw new ArticleNotFoundError('invalid article id')
    }
    return id
  })

  // Verify articles exist
  const articles = await atomService.findMany({
    table: 'article',
    whereIn: ['id', articleIds],
  })
  if (articles.length !== articleIds.length) {
    throw new ArticleNotFoundError('some articles not found')
  }

  // Add articles to channel
  await channelService.addArticlesToCurationChannel({
    channelId,
    articleIds,
  })

  return channel
}

export default resolver
