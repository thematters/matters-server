import type { GQLRecommendationResolvers } from 'definitions'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const channelArticles: GQLRecommendationResolvers['channelArticles'] =
  async (_, { input }, { dataSources: { articleService, atomService } }) => {
    const { channelId } = input
    const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

    const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50

    // check if channel exists and is enabled
    const channel = await atomService.findFirst({
      table: 'channel',
      where: { id: channelId, enabled: true },
    })
    if (!channel) {
      throw new UserInputError('channel not found')
    }

    // get articles from article_channel table
    const [articles, totalCount] = await articleService.findChannelArticles({
      channelId,
      skip,
      take,
      maxTake: MAX_ITEM_COUNT,
    })

    return connectionFromPromisedArray(articles, input, totalCount)
  }
