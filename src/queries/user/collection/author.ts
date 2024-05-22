import type { GQLCollectionResolvers } from 'definitions'

const resolver: GQLCollectionResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(authorId)

export default resolver
