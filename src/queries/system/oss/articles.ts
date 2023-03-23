import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { OSSToArticlesResolver } from 'definitions'

export const articles: OSSToArticlesResolver = async (
  root,
  { input },
  { viewer, dataSources: { articleService, draftService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, items] = await Promise.all([
    articleService.baseCount(),
    articleService.baseFind({ skip, take }),
  ])
  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(items.map((item) => item.draftId)),
    input,
    totalCount
  )
}
