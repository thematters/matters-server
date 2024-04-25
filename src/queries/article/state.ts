import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['state'] = async ({ state }) => state

export default resolver
