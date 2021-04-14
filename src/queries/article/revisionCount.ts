import { ArticleToRevisionCountResolver } from 'definitions'

const resolver: ArticleToRevisionCountResolver = async (
  { articleId },
  _,
  { dataSources: { draftService } }
) => {
  return draftService.countRevisions({ articleId })
}

export default resolver
