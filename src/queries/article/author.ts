import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.loadById(authorId)

export default resolver
