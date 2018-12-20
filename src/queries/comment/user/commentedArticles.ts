import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { commentService, articleService }: Context
) => {
  const comments = await commentService.findByAuthorInBatch(id, offset, limit)
  return articleService.idLoader.loadMany(
    comments.map(({ articleId }: { articleId: string }) => articleId)
  )
}

export default resolver
