import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES, QUEUE_URL } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { aws } from '#connectors/aws/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  {
    dataSources: {
      atomService,
      channelService,
      articleService,
      connections: { redis },
    },
  }
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

    // trigger article channel classification
    channelService.classifyArticlesChannels({ ids: [id] })

    // trigger article language detection
    articleService.detectLanguage(articleVersion.id).then(async (language) => {
      if (!language) {
        return
      }

      await atomService.update({
        table: 'article_version',
        where: { id: articleVersion.id },
        data: { language },
      })

      // invalidate article
      invalidateFQC({
        node: { type: NODE_TYPES.Article, id },
        redis,
      })
    })
  }

  return article
}

export default resolver
