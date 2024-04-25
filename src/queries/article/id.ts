import type { GQLArticleResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

const resolver: GQLArticleResolvers['id'] = async ({ id }) => {
  return toGlobalId({ type: NODE_TYPES.Article, id })
}

export default resolver
