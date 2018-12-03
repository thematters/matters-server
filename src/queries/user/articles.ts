import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ uuid }, _, { articleService }) =>
  articleService.findByAuthor(uuid)

export default resolver
