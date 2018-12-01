import { Resolver } from 'src/definitions'

const resolver: Resolver = (root, { id }, { articleService }, info) =>
  articleService.loader.load(id)

export default resolver
