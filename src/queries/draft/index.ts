import { BatchParams, Context } from 'definitions'
import { toGlobalId } from 'common/utils'

export default {
  User: {
    drafts: (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { draftService }: Context
    ) => draftService.findByAuthorInBatch(id, offset, limit),
    audioDrafts: (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { draftService }: Context
    ) => draftService.findAudioDraftsByAuthor(id, offset, limit)
  },
  Draft: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Draft', id })
    }
  }
}
