import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['author'] = (
  { authorId },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(authorId)

export default resolver
