import { Resolver } from 'src/definitions'

const resolver: Resolver = (root, _, { articleService }) =>
  articleService.countWords(
    root.content || articleService.getContentFromHash(root.hash)
  )

export default resolver
