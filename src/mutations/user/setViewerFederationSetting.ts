import type { Context, GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { toGlobalId } from '#common/utils/index.js'
import {
  FEDERATION_AUTHOR_SETTING,
  FEDERATION_EXPORT_TRIGGER_MODE,
} from '#connectors/article/federationExportService.js'

type SetViewerFederationSettingState = 'enabled' | 'disabled'

const resolver = async (
  _: unknown,
  { input: { state } }: { input: { state: SetViewerFederationSettingState } },
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  userService.validateUserState(viewer)

  const updated = await federationExportService.upsertAuthorFederationSetting({
    userId: viewer.id,
    state,
    updatedBy: viewer.id,
  })

  if (
    state === FEDERATION_AUTHOR_SETTING.disabled &&
    environment.federationExportTriggerMode ===
      FEDERATION_EXPORT_TRIGGER_MODE.sqs
  ) {
    await federationExportService.recordAuthorDisableTriggers({
      userId: viewer.id,
      actorId: viewer.id,
      mode: FEDERATION_EXPORT_TRIGGER_MODE.sqs,
    })
  }

  return {
    ...updated,
    userId: toGlobalId({ type: NODE_TYPES.User, id: updated.userId }),
    updatedBy: updated.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: updated.updatedBy })
      : null,
  }
}

export default resolver as GQLMutationResolvers['setViewerFederationSetting']
