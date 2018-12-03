import { Resolver } from 'src/definitions'

const resolver: Resolver = (parent, _, { articleService }) =>
  articleService.countByAuthor(parent.uuid)

export default resolver
