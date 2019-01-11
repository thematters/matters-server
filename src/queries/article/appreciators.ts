import { connectionFromPromisedArray } from 'graphql-relay'

import { ArticleToAppreciatorsResolver } from 'definitions'

const resolver: ArticleToAppreciatorsResolver = async (
  { id: articleId },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const appreciators = await articleService.findAppreciators(articleId)
  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      appreciators.map(({ senderId }: { senderId: string }) => senderId)
    ),
    input
  )
}

export default resolver
