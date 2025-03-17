import type { GQLQueryResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'

const logger = getLogger('resolver-root-articles')

const resolver: GQLQueryResolvers['article'] = async (
  _,
  { input: { mediaHash, shortHash } },
  { dataSources: { articleService, atomService } }
) => {
  if (shortHash) {
    return articleService.findArticleByShortHash(shortHash)
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
