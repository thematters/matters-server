import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['pinned'] = async ({ pinned }) => pinned

export default resolver
