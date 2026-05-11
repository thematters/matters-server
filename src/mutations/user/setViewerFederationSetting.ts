import type { Context, GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES, USER_FEATURE_FLAG_TYPE } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'

type SetViewerFederationSettingState = 'enabled' | 'disabled'

const resolver = async (
  _: unknown,
  { input: { state } }: { input: { state: SetViewerFederationSettingState } },
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  userService.validateUserState(viewer)

  const featureFlags = await userService.findFeatureFlags(viewer.id)
  const isFediverseBeta = featureFlags
    .map(({ type: featureFlagType }) => featureFlagType)
    .includes(USER_FEATURE_FLAG_TYPE.fediverseBeta)

  if (!isFediverseBeta) {
    throw new ForbiddenError('viewer is not in Fediverse beta')
  }

  const updated = await federationExportService.upsertAuthorFederationSetting({
    userId: viewer.id,
    state,
    updatedBy: viewer.id,
  })

  return {
    ...updated,
    userId: toGlobalId({ type: NODE_TYPES.User, id: updated.userId }),
    updatedBy: updated.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: updated.updatedBy })
      : null,
  }
}

export default resolver as GQLMutationResolvers['setViewerFederationSetting']
