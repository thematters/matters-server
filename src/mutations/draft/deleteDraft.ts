import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums/index.js'
import {
  AuthenticationError,
  DraftNotFoundError,
  ForbiddenError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { CacheService } from 'connectors/index.js'
import { MutationToDeleteDraftResolver } from 'definitions'

const resolver: MutationToDeleteDraftResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const draft = await atomService.findUnique({
    table: 'draft',
    where: { id: dbId },
  })

  if (!draft || draft.archived) {
    throw new DraftNotFoundError('target draft does not exist')
  }
  if (draft.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  await atomService.update({
    table: 'draft',
    where: { id: draft.id },
    data: { archived: true, updatedAt: new Date() },
  })

  const cacheService = new CacheService()
  invalidateFQC({
    node: { type: NODE_TYPES.User, id: viewer.id },
    redis: cacheService.redis,
  })

  return true
}
export default resolver
