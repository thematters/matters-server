import { UserStatusToArticleCountResolver } from 'definitions'

const resolver: UserStatusToArticleCountResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.countByAuthor(id, true)

export default resolver
