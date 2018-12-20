import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { articleService }: Context
) => articleService.findByAuthorInBatch(id, offset, limit)

export default resolver
