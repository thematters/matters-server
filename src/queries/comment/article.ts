import { CommentToArticleResolver } from 'definitions'

const resolver: CommentToArticleResolver = (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.draftLoader.load(articleId)

export default resolver
