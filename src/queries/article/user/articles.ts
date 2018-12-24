import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { articleService } }: Context
) => articleService.findByAuthor({ id, offset, limit })

export default resolver
