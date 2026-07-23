import type {
  FederationSocialAction,
  FederationSocialActionInput,
} from '#connectors/article/federationExportService.js'
import type { Context } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { assertFediverseViewer } from '#queries/fediverse/utils.js'

const resolver = async (
  _: unknown,
  {
    input,
  }: {
    input: FederationSocialActionInput
  },
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  const { actorId, actorHandle } = await assertFediverseViewer({
    viewer,
    userService,
    federationExportService,
  })
  const normalized = {
    ...input,
    action: input.action as FederationSocialAction,
  } as FederationSocialActionInput
  if (
    normalized.action === 'follow' &&
    !normalized.remoteActorId &&
    !normalized.account
  ) {
    throw new UserInputError('remote actor account or ID is required')
  }
  if (
    ['unfollow', 'block', 'unblock', 'report'].includes(normalized.action) &&
    !normalized.remoteActorId
  ) {
    throw new UserInputError('remote actor ID is required')
  }
  if (normalized.action === 'report' && !normalized.reason?.trim()) {
    throw new UserInputError('report reason is required')
  }
  if (
    ['reply', 'like', 'unlike', 'announce', 'unannounce'].includes(
      normalized.action
    ) &&
    !normalized.objectId
  ) {
    throw new UserInputError('remote object ID is required')
  }

  return federationExportService.runSocialAction({
    actorHandle,
    actorId,
    input: normalized,
  })
}

export default resolver
