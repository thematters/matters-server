import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['state'] = async ({ state }) => state

export default resolver
