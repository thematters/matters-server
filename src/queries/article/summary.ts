import { ArticleToSummaryResolver } from 'definitions'

const resolver: ArticleToSummaryResolver = (
  { hash },
  _,
  { dataSources: { articleService } }
) => articleService.getContentFromHash(hash).slice(0, 30)

export default resolver
