import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['shortHash'] = async ({ shortHash }) =>
  shortHash || ''

export default resolver
