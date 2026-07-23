import type { Context } from '#definitions/index.js'

import { assertFediverseViewer } from './utils.js'

const resolver = async (
  _: unknown,
  __: unknown,
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  const { actorHandle } = await assertFediverseViewer({
    viewer,
    userService,
    federationExportService,
  })
  return federationExportService.loadSocialProfile(actorHandle)
}

export default resolver
