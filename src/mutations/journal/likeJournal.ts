import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

export const likeJournal: GQLMutationResolvers['likeJournal'] = async (
  _,
  { input: { id: globalId } },
  { viewer, dataSources: { journalService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Journal') {
    throw new UserInputError('invalid id')
  }
  await journalService.like(id, viewer)

  return atomService.journalIdLoader.load(id)
}

export const unlikeJournal: GQLMutationResolvers['unlikeJournal'] = async (
  _,
  { input: { id: globalId } },
  { viewer, dataSources: { journalService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Journal') {
    throw new UserInputError('invalid id')
  }
  await journalService.unlike(id, viewer)

  return atomService.journalIdLoader.load(id)
}
