import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['shortHash'] = async ({ shortHash }) =>
  shortHash || ''

export default resolver
