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
    ) => draftService.findAudioDraftsByAuthorInBatch(id, offset, limit)
  },
  Draft: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Draft', id })
    },
    cover: async ({ cover }: { cover: string }, _: any, { systemService }: Context) => {
      return cover ? systemService.findAssetUrl(cover) : null
    }
  },
  AudioDraft: {
    audio: async ({ audio }: { audio: string }, _: any, { systemService }: Context) => {
      return audio ? systemService.findAssetUrl(audio) : null
    }
  }
}
