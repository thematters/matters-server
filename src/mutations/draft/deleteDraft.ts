import { MutationToDeleteDraftResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToDeleteDraftResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this')
  }

  const { id: dbId } = fromGlobalId(id)
  const draft = await draftService.dataloader.load(dbId)
  if (!draft) {
    throw new Error('target draft does not exist')
  }
  if (draft.authorId !== viewer.id) {
    throw new Error('disallow to process')
  }

  await draftService.baseDelete(dbId)

  return true
}
export default resolver
