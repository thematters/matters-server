import { CommentToArticleResolver } from 'definitions'

const resolver: CommentToArticleResolver = (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.linkedDraftLoader.load(articleId)

export default resolver
