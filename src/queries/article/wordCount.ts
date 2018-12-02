import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ wordCount, hash }, _, { articleService }) =>
  wordCount ||
  articleService.countWords(articleService.getContentFromHash(hash))

export default resolver
