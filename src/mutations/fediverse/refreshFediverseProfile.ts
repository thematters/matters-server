import type { Context } from '#definitions/index.js'

import { assertFediverseViewer } from '#queries/fediverse/utils.js'

const resolver = async (
  _: unknown,
  __: unknown,
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  const { actorId } = await assertFediverseViewer({
    viewer,
    userService,
    federationExportService,
  })
  return federationExportService.refreshSocialProfile(actorId)
}

export default resolver
