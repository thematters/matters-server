import { ArticleToResponseCountResolver } from 'definitions'

const resolver: ArticleToResponseCountResolver = (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.countByResponses({ id })

export default resolver
