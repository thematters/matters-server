import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.countByAuthor(id)

export default resolver
