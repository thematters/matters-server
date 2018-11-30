import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ articleId }, _, { articleService }) =>
  articleService.loader.load(articleId)

export default resolver
