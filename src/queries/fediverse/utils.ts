import type { FederationExportService } from '#connectors/article/federationExportService.js'
import type { Context } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { FEDERATION_AUTHOR_SETTING } from '#connectors/article/federationExportService.js'

export const assertFediverseViewer = async ({
  viewer,
  userService,
  federationExportService,
}: {
  viewer: Context['viewer']
  userService: Context['dataSources']['userService']
  federationExportService: FederationExportService
}) => {
  userService.validateUserState(viewer)
  if (!viewer.id || !viewer.userName) {
    throw new ForbiddenError('Fediverse requires an active username')
  }

  const setting = await federationExportService.loadAuthorFederationSetting(
    viewer.id
  )
  if (setting?.state !== FEDERATION_AUTHOR_SETTING.enabled) {
    throw new ForbiddenError('Enable Fediverse publishing before using it')
  }

  return {
    actorId: viewer.id,
    actorHandle: viewer.userName,
  }
}
