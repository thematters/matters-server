import { Resolver } from 'definitions'

const resolver: Resolver = ({ articleId }, _, { articleService }) =>
  articleService.dataloader.load(articleId)

export default resolver
