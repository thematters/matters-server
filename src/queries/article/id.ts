import type { GQLArticleResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { getLogger } from 'common/logger'
import { toGlobalId } from 'common/utils'

const logger = getLogger('query-article-id')

const resolver: GQLArticleResolvers['id'] = async (
  { articleId, id },
  _,
  __,
  info
) => {
  if (!articleId) {
    logger.warn(
      "Article's fields should derive from Draft instead of Article: %j",
      info.path
    )
    return toGlobalId({ type: NODE_TYPES.Article, id })
  }
  return toGlobalId({ type: NODE_TYPES.Article, id: articleId })
}

export default resolver
