import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.countByAuthor(id)

export default resolver
