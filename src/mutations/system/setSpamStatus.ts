import type { GQLMutationResolvers } from '#definitions/index.js'

import { QUEUE_URL } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { aws } from '#connectors/aws/index.js'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  { dataSources: { atomService, channelService, articleService } }
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
    // trigger IPFS publication
    const articleVersion = await articleService.loadLatestArticleVersion(id)
    aws.sqsSendMessage({
      messageBody: { articleId: id, articleVersionId: articleVersion.id },
      queueUrl: QUEUE_URL.ipfsPublication,
    })

    channelService.classifyArticlesChannels({ ids: [id] })
  }

  return article
}

export default resolver
