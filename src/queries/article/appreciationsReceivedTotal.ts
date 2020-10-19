import { ArticleToAppreciationsReceivedTotalResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedTotalResolver = async (
  { articleId },
  _: any,
  { dataSources: { articleService } }
) => {
  return articleService.sumAppreciation(articleId)
}

export default resolver
