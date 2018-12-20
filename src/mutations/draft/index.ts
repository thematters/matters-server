import putAudioDraft from './putAudioDraft'
import deleteAudioDraft from './deleteAudioDraft'
import addDraftTag from './addDraftTag'
import createDraft from './createDraft'
import deleteDraft from './deleteDraft'
import deleteDraftTag from './deleteDraftTag'
import editDraft from './editDraft'

export default {
  Mutation: {
    putAudioDraft,
    deleteAudioDraft,
    createDraft,
    deleteDraft,
    editDraft,
    addDraftTag,
    deleteDraftTag
  }
}
