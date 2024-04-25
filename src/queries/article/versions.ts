import type { GQLArticleResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLArticleResolvers['versions'] = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const [versions, totalCount] = await articleService.findArticleVersions(id, {
    take,
    skip,
  })
  return connectionFromArray(versions, input, totalCount)
}

export default resolver
