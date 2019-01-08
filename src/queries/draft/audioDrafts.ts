import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { draftService } }: Context
) => draftService.findAudiodraftsByAuthor(id, offset, limit)

export default resolver
