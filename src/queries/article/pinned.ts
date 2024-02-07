import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['pinned'] = async ({ pinned }) => pinned

export default resolver
