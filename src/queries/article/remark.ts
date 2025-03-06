import type { GQLArticleResolvers } from 'definitions/index.js'

const resolver: GQLArticleResolvers['remark'] = async ({ remark }) => remark

export default resolver
