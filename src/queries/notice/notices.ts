import { connectionFromPromisedArray } from 'graphql-relay'
import { UserToNoticesResolver } from 'definitions'

const resolver: UserToNoticesResolver = (
  { id },
  { input },
  { dataSources: { notificationService } }
) => {
  return connectionFromPromisedArray(
    notificationService.noticeService.findByUser(id),
    input
  )
}

export default resolver
