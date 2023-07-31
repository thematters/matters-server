// import { UserNotFoundError } from 'common/errors'
import type { GQLMutationResolvers } from 'definitions'

import { publicationQueue } from 'connectors/queue'

const resolver: GQLMutationResolvers['refreshIPNSFeed'] = async (
  _,
  { input: { userName, numArticles = 50 } },
  { dataSources: { userService } }
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
