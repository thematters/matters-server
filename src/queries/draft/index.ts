import { BatchParams, Context } from 'definitions'

export default {
  Query: {
    draft: (_: any, { uuid }: { uuid: string }, { draftService }: Context) =>
      draftService.uuidLoader.load(uuid)
  },
  User: {
    drafts: (
      { id }: { id: number },
      { offset, limit }: BatchParams,
      { draftService }: Context
    ) => draftService.findByAuthorInBatch(id, offset, limit)
  }
}
