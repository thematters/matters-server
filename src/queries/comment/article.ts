import { Resolver } from 'definitions'

const resolver: Resolver = ({ articleId }, _, { articleService }) =>
  articleService.idLoader.load(articleId)

export default resolver
