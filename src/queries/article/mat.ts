import { ArticleToMATResolver } from 'definitions'

const resolver: ArticleToMATResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  return articleService.sumAppreciation(id)
}

export default resolver
