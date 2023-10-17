import type { GQLCollectionResolvers } from 'definitions'

const resolver: GQLCollectionResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.loadById(authorId)

export default resolver
