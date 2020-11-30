import { CommentToFromDonatorResolver } from 'definitions'

const resolver: CommentToFromDonatorResolver = (
  { authorId, articleId },
  _,
  { dataSources: { articleService } }
) => articleService.isDonator({ articleId, userId: authorId })

export default resolver
