import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { userService, articleService } }: Context
) => {
  const readHistory = await userService.findReadHistory(id, offset, limit)

  return Promise.all(
    readHistory.map(async ({ uuid, articleId, createdAt }) => {
      const article = await articleService.dataloader.load(articleId)
      return {
        uuid,
        article,
        readAt: createdAt
      }
    })
  )
}

export default resolver
