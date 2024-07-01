import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

export const likeMoment: GQLMutationResolvers['likeMoment'] = async (
  _,
  { input: { id: globalId } },
  { viewer, dataSources: { momentService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Moment') {
    throw new UserInputError('invalid id')
  }
  await momentService.like(id, viewer)

  return atomService.momentIdLoader.load(id)
}

export const unlikeMoment: GQLMutationResolvers['unlikeMoment'] = async (
  _,
  { input: { id: globalId } },
  { viewer, dataSources: { momentService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Moment') {
    throw new UserInputError('invalid id')
  }
  await momentService.unlike(id, viewer)

  return atomService.momentIdLoader.load(id)
}
