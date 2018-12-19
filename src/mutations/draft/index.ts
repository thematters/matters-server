import addDraftTag from './addDraftTag'
import createDraft from './createDraft'
import createOrEditAudioDraft from './createOrEditAudioDraft'
import deleteDraft from './deleteDraft'
import deleteDraftTag from './deleteDraftTag'
import editDraft from './editDraft'

export default {
  Mutation: {
    createOrEditAudioDraft,
    createDraft,
    deleteDraft,
    editDraft,
    addDraftTag,
    deleteDraftTag
  }
}
