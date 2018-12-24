import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { draftService }: Context
) => draftService.findAudioDraftsByAuthor(id, offset, limit)

export default resolver
