import type { GQLArticleResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

const resolver: GQLArticleResolvers['id'] = async ({ id }) => {
  return toGlobalId({ type: NODE_TYPES.Article, id })
}

export default resolver
