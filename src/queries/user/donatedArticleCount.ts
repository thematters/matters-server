import { UserStatusToDonatedArticleCountResolver } from 'definitions'

const resolver: UserStatusToDonatedArticleCountResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countDonatedArticle(id)

export default resolver
