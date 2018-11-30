import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ hash }, _, { articleService }) =>
  articleService.getContentFromHash(hash)

export default resolver
