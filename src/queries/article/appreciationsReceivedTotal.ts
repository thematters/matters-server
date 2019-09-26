import { ArticleToAppreciationTotalResolver } from 'definitions'

const resolver: ArticleToAppreciationTotalResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  return await articleService.sumAppreciation(id)
}

export default resolver
