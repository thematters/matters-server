import type { GQLUserResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

const resolver: GQLUserResolvers['federationSetting'] = async (
  { id }: { id?: string | null },
  _: unknown,
  { dataSources: { federationExportService } }: any
) => {
  if (!id) {
    return null
  }

  const row = await federationExportService.loadAuthorFederationSetting(id)
  if (!row) {
    return null
  }

  return {
    ...row,
    userId: toGlobalId({ type: NODE_TYPES.User, id: row.userId }),
    updatedBy: row.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: row.updatedBy })
      : null,
  }
}

export default resolver
