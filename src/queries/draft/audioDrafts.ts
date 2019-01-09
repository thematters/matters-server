import { connectionFromPromisedArray } from 'graphql-relay'

import { UserToAudiodraftsResolver } from 'definitions'

const resolver: UserToAudiodraftsResolver = (
  { id },
  { input },
  { dataSources: { draftService } }
) =>
  connectionFromPromisedArray(draftService.findAudiodraftsByAuthor(id), input)

export default resolver
