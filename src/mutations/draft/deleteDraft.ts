import {
  AuthenticationError,
  UserInputError,
  ForbiddenError
} from 'apollo-server'
import { MutationToDeleteDraftResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToDeleteDraftResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const draft = await draftService.dataloader.load(dbId)
  if (!draft || draft.archived) {
    throw new UserInputError('target draft does not exist')
  }
  if (draft.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  await draftService.archive(draft.id)

  return true
}
export default resolver
