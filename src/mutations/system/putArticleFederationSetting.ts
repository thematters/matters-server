import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putArticleFederationSetting'] = async (
  _: unknown,
  { input: { id, state } },
  { viewer, dataSources: { federationExportService } }
) => {
  const { id: articleId, type } = fromGlobalId(id)

  if (type !== NODE_TYPES.Article) {
    throw new UserInputError('id must be an Article ID')
  }

  const updated = await federationExportService.upsertArticleFederationSetting({
    articleId,
    state,
    updatedBy: viewer.id || null,
  })

  return {
    ...updated,
    articleId: toGlobalId({ type: NODE_TYPES.Article, id: updated.articleId }),
    updatedBy: updated.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: updated.updatedBy })
      : null,
  }
}

export default resolver
