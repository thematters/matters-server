import { MutationToDeleteAudiodraftResolver } from 'definitions'

const resolver: MutationToDeleteAudiodraftResolver = async (
  _,
  { input: { id: uuid } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this')
  }

  const audioDraft = await draftService.baseFindByUUID(uuid, 'audio_draft')
  if (!audioDraft) {
    throw new Error('target draft does not exist')
  }
  if (audioDraft.authroId !== viewer.id) {
    throw new Error('disallow to process')
  }

  await draftService.baseDelete(audioDraft.id, 'audio_draft')

  return true
}
export default resolver
