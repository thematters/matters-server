import { BatchParams, Context } from 'definitions'

export default {
  Query: {
    draft: (_: any, { uuid }: { uuid: string }, { draftService }: Context) =>
      draftService.uuidLoader.load(uuid)
  },
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
  }
}
