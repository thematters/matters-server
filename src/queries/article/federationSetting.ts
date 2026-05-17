import type { GQLArticleResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

const resolver: GQLArticleResolvers['federationSetting'] = async (
  { id }: { id: string },
  _: unknown,
  { dataSources: { federationExportService } }: any
) => {
  const row = await federationExportService.loadArticleFederationSetting(id)
  if (!row) {
    return null
  }

  return {
    ...row,
    articleId: toGlobalId({ type: NODE_TYPES.Article, id: row.articleId }),
    updatedBy: row.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: row.updatedBy })
      : null,
  }
}

export default resolver
