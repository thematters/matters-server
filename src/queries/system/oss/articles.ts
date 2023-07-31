import type { GQLOSSResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const articles: GQLOSSResolvers['articles'] = async (
  _,
  { input },
  { dataSources: { articleService, draftService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, items] = await Promise.all([
    articleService.baseCount(),
    articleService.baseFind({ skip, take }),
  ])
  return connectionFromPromisedArray(
    draftService.loadByIds(items.map((item) => item.draftId)),
    input,
    totalCount
  )
}
