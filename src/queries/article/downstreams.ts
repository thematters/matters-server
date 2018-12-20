import { Resolver, BatchParams } from 'definitions'

const resolver: Resolver = (
  { id },
  { input: { offset, limit } }: BatchParams,
  { articleService }
) => articleService.findByUpstream(id, offset, limit)

export default resolver
