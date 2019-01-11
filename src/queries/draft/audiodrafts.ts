import { connectionFromPromisedArray } from 'graphql-relay'

import { Resolver } from 'definitions'

const resolver: Resolver = (
  { id },
  { input },
  { dataSources: { draftService } }
) =>
  connectionFromPromisedArray(draftService.findAudiodraftsByAuthor(id), input)

export default resolver
