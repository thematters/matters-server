import { connectionFromPromisedArray } from 'common/utils/index.js'
import { UserToDraftsResolver } from 'definitions'

const resolver: UserToDraftsResolver = (
  { id },
  { input },
  { dataSources: { draftService } }
) =>
  connectionFromPromisedArray(draftService.findUnpublishedByAuthor(id), input)

export default resolver
