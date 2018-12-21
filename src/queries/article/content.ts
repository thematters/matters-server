import { Resolver } from 'definitions'

const resolver: Resolver = ({ hash }, _, { articleService }) =>
  articleService.getContentFromHash(hash)

export default resolver
