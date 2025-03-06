import type { GQLRecommendationResolvers } from 'definitions/index.js'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums/index.js'
import { UserInputError } from 'common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
} from 'common/utils/index.js'

export const channelArticles: GQLRecommendationResolvers['channelArticles'] =
  async (_, { input }, { dataSources: { articleService, atomService } }) => {
    const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

    let channelDbId: string | null = null
    if (input.channelId) {
      const { type, id: dbId } = fromGlobalId(input.channelId)

      if (type !== 'Channel') {
        throw new UserInputError('invalid campaign id')
      }

      channelDbId = dbId

      const channel = await atomService.findFirst({
        table: 'channel',
        where: { id: channelDbId, enabled: true },
      })

      if (!channel) {
        throw new UserInputError('channel not found')
      }
    } else if (input.shortHash) {
      const channel = await atomService.findFirst({
        table: 'channel',
        where: { shortHash: input.shortHash, enabled: true },
      })

      if (!channel) {
        throw new UserInputError('channel not found')
      }

      channelDbId = channel.id
    }

    if (!channelDbId) {
      throw new UserInputError('channel not found')
    }

    const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50

    // get articles from article_channel table
    const [articles, totalCount] = await articleService.findChannelArticles({
      channelId: channelDbId,
      skip,
      take,
      maxTake: MAX_ITEM_COUNT,
    })

    return connectionFromPromisedArray(articles, input, totalCount)
  }
