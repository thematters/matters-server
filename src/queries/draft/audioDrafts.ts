import { Context, UserToAudiodraftsResolver } from 'definitions'
import { connectionFromPromisedArray } from 'graphql-relay'

const resolver: UserToAudiodraftsResolver = (
  { id }: { id: string },
  { input },
  { dataSources: { draftService } }: Context
) =>
  connectionFromPromisedArray(draftService.findAudiodraftsByAuthor(id), input)

export default resolver
