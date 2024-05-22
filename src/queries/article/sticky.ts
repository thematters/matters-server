import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['sticky'] = async ({ pinned }) => pinned

export default resolver
