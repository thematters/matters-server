import { ArticleToMATResolver } from 'definitions'

const resolver: ArticleToMATResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  return await articleService.totalAppreciation(id)
}

export default resolver
