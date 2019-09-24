import { ArticleToAppreciationTotalResolver } from 'definitions'

const resolver: ArticleToAppreciationTotalResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  return await articleService.totalAppreciation(id)
}

export default resolver
