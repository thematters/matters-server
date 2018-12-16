import { BatchParams, Context } from 'definitions'
import { toGlobalId } from 'common/utils'

export default {
  User: {
    drafts: (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { draftService }: Context
    ) => draftService.findByAuthorInBatch(id, offset, limit),
    audioDrafts: (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { draftService }: Context
    ) => draftService.findAudioDraftsByAuthorInBatch(id, offset, limit)
  },
  Draft: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Draft', id })
    }
  }
}
