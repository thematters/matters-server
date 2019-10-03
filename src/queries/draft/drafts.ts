import { connectionFromPromisedArray } from 'common/utils'
import { UserToDraftsResolver } from 'definitions'

const resolver: UserToDraftsResolver = (
  { id },
  { input },
  { dataSources: { draftService } }
) => connectionFromPromisedArray(draftService.findByAuthor(id), input)

export default resolver
