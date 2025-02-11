import type { GQLMutationResolvers } from 'definitions'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  { dataSources: { atomService, channelService } }
) => {
  const id = fromGlobalId(globalId).id

  if (!id) {
    throw new UserInputError('id is invalid')
  }

  const article = await atomService.update({
    table: 'article',
    where: { id },
    data: { isSpam },
  })

  // trigger article channel classification if the article is not spam
  if (!isSpam) {
    channelService.classifyArticlesChannels({ ids: [id] })
  }

  return article
}

export default resolver
