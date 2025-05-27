import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setArticleTopicChannels'] = async (
  _,
  { input: { id: globalId, channels: newChannelIds } },
  { dataSources: { atomService, channelService } }
) => {
  const articleId = fromGlobalId(globalId).id
  const channelIds = newChannelIds.map((id) => fromGlobalId(id).id)

  const article = await atomService.findUnique({
    table: 'article',
    where: { id: articleId },
  })
  if (!article) {
    throw new UserInputError('Invalid article id')
  }

  await channelService.setArticleTopicChannels({
    articleId,
    channelIds,
  })
  await channelService.resolveArticleFeedback(articleId)

  return article
}

export default resolver
