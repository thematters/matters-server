// import { UserNotFoundError } from 'common/errors.js'
import { publicationQueue } from 'connectors/queue/index.js'
import { MutationToRefreshIPNSFeedResolver } from 'definitions'

const resolver: MutationToRefreshIPNSFeedResolver = async (
  _,
  { input: { userName, numArticles = 50 } },
  { viewer, dataSources: { atomService, userService } }
) => {
  // const ipnsKeyRec =
  await userService.findOrCreateIPNSKey(userName)

  publicationQueue.refreshIPNSFeed({
    userName,
    numArticles,
    forceReplace: true,
  })

  return userService.findByUserName(userName)
}

export default resolver
