import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError, AuthenticationError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setArticleChannels'] = async (
  _,
  { input: { id: globalId, channels: newChannelIds } },
  { viewer, dataSources: { atomService, channelService } }
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

  await channelService.setArticleChannels({
    articleId,
    channelIds,
  })

  return article
}

export default resolver
