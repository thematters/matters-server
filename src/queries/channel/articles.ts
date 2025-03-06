import type { GQLChannelResolvers } from 'definitions/index.js'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums/index.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'

const resolver: GQLChannelResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50

  const [articles, totalCount] = await articleService.findChannelArticles({
    channelId: id,
    skip,
    take,
    maxTake: MAX_ITEM_COUNT,
  })

  return connectionFromPromisedArray(articles, input, totalCount)
}

export default resolver
