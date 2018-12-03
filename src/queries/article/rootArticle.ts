import { Resolver } from 'src/definitions'

const resolver: Resolver = (root, { uuid }, { articleService }, info) =>
  articleService.loader.load(uuid)

export default resolver
