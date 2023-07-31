import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.loadById(authorId)

export default resolver
