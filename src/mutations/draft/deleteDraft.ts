import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const { id: dbId } = fromGlobalId(id)
  const draft = await draftService.idLoader.load(dbId)
  if (!draft) {
    throw new Error('target draft does not exist')
  }
  if (draft.authroId !== viewer.id) {
    throw new Error('disallow to process')
  }

  await draftService.baseDelete(dbId)

  return true
}
export default resolver
