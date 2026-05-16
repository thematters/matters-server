import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putUserFederationSetting'] = async (
  _: unknown,
  { input: { id, state } },
  { viewer, dataSources: { federationExportService } }
) => {
  const { id: userId, type } = fromGlobalId(id)

  if (type !== NODE_TYPES.User) {
    throw new UserInputError('id must be a User ID')
  }

  const updated = await federationExportService.upsertAuthorFederationSetting({
    userId,
    state,
    updatedBy: viewer.id || null,
  })

  return {
    ...updated,
    userId: toGlobalId({ type: NODE_TYPES.User, id: updated.userId }),
    updatedBy: updated.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: updated.updatedBy })
      : null,
  }
}

export default resolver
