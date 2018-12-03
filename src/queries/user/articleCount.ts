import { Resolver } from 'src/definitions'

const resolver: Resolver = (parent, _, { articleService }) =>
  articleService.countByAuthor(parent.id)

export default resolver
