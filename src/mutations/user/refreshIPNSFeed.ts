import type { GQLMutationResolvers } from 'definitions'

const resolver: GQLMutationResolvers['refreshIPNSFeed'] = async (
  _,
  { input: { userName, numArticles = 50 } },
  {
    dataSources: {
      userService,
      queues: { publicationQueue },
    },
  }
) => {
  const ipnsKeyRec = await userService.findOrCreateIPNSKey(userName)

  if (ipnsKeyRec) {
    publicationQueue.refreshIPNSFeed({
      userName,
      numArticles,
      forceReplace: true,
    })
  }

  return userService.findByUserName(userName)
}

export default resolver
