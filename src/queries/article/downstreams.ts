import { Resolver, BatchParams } from 'definitions'

const resolver: Resolver = (
  { id },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { articleService } }
) => articleService.findByUpstream(id, offset, limit)

export default resolver
