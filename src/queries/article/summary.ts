import { makeSummary } from '@matters/matters-html-formatter'

import { ArticleToSummaryResolver } from 'definitions'

const resolver: ArticleToSummaryResolver = async (
  { articleId, summary },
  _,
  { viewer, dataSources: { articleService } }
) => {
  // fetch data from the latest linked draft
  const article = await articleService.dataloader.load(articleId)
  return makeSummary(summary, article?.cover ? 110 : 140)
}

export default resolver
