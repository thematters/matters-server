import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['revisionCount'] = async ({
  revisionCount,
}) => revisionCount || 0

export default resolver
