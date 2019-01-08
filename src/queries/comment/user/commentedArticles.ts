import { uniq } from 'lodash'

import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { commentService, articleService } }: Context
) => {
  const comments = await commentService.findByAuthorInBatch(id, offset, limit)
  const articleIds = uniq(
    comments.map(({ articleId }: { articleId: string }) => articleId)
  )
  return articleService.dataloader.loadMany(articleIds)
}

export default resolver
