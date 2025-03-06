import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['revisionCount'] = async ({
  revisionCount,
}) => revisionCount || 0

export default resolver
