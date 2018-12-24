import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { articleService }) =>
  articleService.countByAuthor(id)

export default resolver
