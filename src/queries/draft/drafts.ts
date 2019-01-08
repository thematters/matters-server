import { Context, UserToDraftsResolver } from 'definitions'
import { connectionFromPromisedArray } from 'graphql-relay'

const resolver: UserToDraftsResolver = (
  { id }: { id: string },
  { input },
  { dataSources: { draftService } }: Context
) => connectionFromPromisedArray(draftService.findByAuthor(id), input)

export default resolver
