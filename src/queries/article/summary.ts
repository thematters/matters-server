import { makeSummary } from 'common/utils'
import { ArticleToSummaryResolver } from 'definitions'

const resolver: ArticleToSummaryResolver = async (
  { content, articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return makeSummary(content, article?.cover ? 110 : 140)
}

export default resolver
