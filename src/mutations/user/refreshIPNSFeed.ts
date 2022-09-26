// import { UserNotFoundError } from 'common/errors'
import { publicationQueue } from 'connectors/queue'
import { MutationToRefreshIPNSFeedResolver } from 'definitions'

const resolver: MutationToRefreshIPNSFeedResolver = async (
  _,
  { input: { userName, numArticles = 50 } },
  { viewer, dataSources: { atomService, userService } }
) => {
  // const ipnsKeyRec =
  await userService.findOrCreateIPNSKey(userName)

  publicationQueue.refreshIPNSFeed({ userName, numArticles })

  return userService.findByUserName(userName)
}

export default resolver
