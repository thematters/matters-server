import { connectionFromPromisedArray } from 'graphql-relay'

import { ArticleToSubscribersResolver } from 'definitions'

const resolver: ArticleToSubscribersResolver = async (
  { id },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const actions = await articleService.findSubscriptions(id)
  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ userId }: { userId: string }) => userId)
    ),
    input
  )
}

export default resolver
