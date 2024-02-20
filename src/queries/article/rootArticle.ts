import type { GQLQueryResolvers } from 'definitions'

import { UserInputError } from 'common/errors'
import { getLogger } from 'common/logger'

const logger = getLogger('resolver-root-articles')

const resolver: GQLQueryResolvers['article'] = async (
  _,
  { input: { mediaHash, shortHash } },
  { dataSources: { articleService, atomService } }
) => {
  if (shortHash) {
    const { id } = await articleService.findArticleByShortHash(shortHash)
    return atomService.articleIdLoader.load(id)
  }
  if (mediaHash) {
    const node = await articleService.findVersionByMediaHash(mediaHash)
    if (!node) {
      logger.warn('article version by media_hash:%s not found', mediaHash)
    }
    return atomService.articleIdLoader.load(node.articleId)
  }

  throw new UserInputError('one of mediaHash or shortHash is required')
}

export default resolver
