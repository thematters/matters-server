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
  const audioDraft = await draftService.baseFindById(dbId, 'audio_draft')
  if (!audioDraft) {
    throw new Error('target draft does not exist')
  }
  if (audioDraft.authroId !== viewer.id) {
    throw new Error('disallow to process')
  }

  await draftService.baseDelete(dbId, 'audio_draft')

  return true
}
export default resolver
