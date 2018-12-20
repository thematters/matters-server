import addDraftTag from './addDraftTag'
import createDraft from './createDraft'
import putAudioDraft from './putAudioDraft'
import deleteDraft from './deleteDraft'
import deleteDraftTag from './deleteDraftTag'
import editDraft from './editDraft'

export default {
  Mutation: {
    putAudioDraft,
    createDraft,
    deleteDraft,
    editDraft,
    addDraftTag,
    deleteDraftTag
  }
}
