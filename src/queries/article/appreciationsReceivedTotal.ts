import { ArticleToAppreciationsReceivedTotalResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedTotalResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  return articleService.sumAppreciation(id)
}

export default resolver
