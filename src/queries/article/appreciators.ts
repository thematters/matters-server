import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id: articleId }: { id: string },
  { input }: BatchParams,
  { dataSources: { articleService, userService } }: Context
) => {
  const appreciators = await articleService.findAppreciators({
    articleId,
    ...input
  })
  return userService.dataloader.loadMany(
    appreciators.map(({ userId }) => userId)
  )
}

export default resolver
