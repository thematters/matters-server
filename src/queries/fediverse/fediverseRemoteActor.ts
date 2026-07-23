import type { Context } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'

import { assertFediverseViewer } from './utils.js'

const resolver = async (
  _: unknown,
  {
    input: { account, actorId },
  }: {
    input: {
      account?: string | null
      actorId?: string | null
    }
  },
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  await assertFediverseViewer({
    viewer,
    userService,
    federationExportService,
  })
  if (!account && !actorId) {
    throw new UserInputError('account or actorId is required')
  }
  return federationExportService.resolveSocialRemoteActor({
    account,
    actorId,
  })
}

export default resolver
