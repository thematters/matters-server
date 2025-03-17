import type { GQLCollectionResolvers } from '#definitions/index.js'

const resolver: GQLCollectionResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(authorId)

export default resolver
