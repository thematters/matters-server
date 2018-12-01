import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ id }, _, { articleService }) =>
  articleService.findByAuthor(id)

export default resolver
