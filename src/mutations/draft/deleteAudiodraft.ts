import { MutationToDeleteAudiodraftResolver } from 'definitions'
import {
  DraftNotFoundError,
  ForbiddenError,
  AuthenticationError
} from 'common/errors'

const resolver: MutationToDeleteAudiodraftResolver = async (
  _,
  { input: { id: uuid } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const audioDraft = await draftService.baseFindByUUID(uuid, 'audio_draft')
  if (!audioDraft) {
    throw new DraftNotFoundError('target draft does not exist')
  }
  if (audioDraft.authroId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  await draftService.baseDelete(audioDraft.id, 'audio_draft')

  return true
}
export default resolver
