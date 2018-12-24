import { Resolver } from 'definitions'

const resolver: Resolver = (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.dataloader.load(articleId)

export default resolver
