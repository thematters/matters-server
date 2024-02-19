import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['remark'] = async ({ remark }) => remark

export default resolver
