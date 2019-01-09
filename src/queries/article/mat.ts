import { ArticleToMATResolver } from 'definitions'

const resolver: ArticleToMATResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  return await articleService.countAppreciation(id)
}

export default resolver
