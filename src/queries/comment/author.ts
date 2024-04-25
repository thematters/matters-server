import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(authorId)

export default resolver
