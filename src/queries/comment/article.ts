import { CommentToArticleResolver } from 'definitions'

const resolver: CommentToArticleResolver = (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.dataloader.load(articleId)

export default resolver
