import { sampleSize } from 'lodash'
import {
  connectionFromPromisedArray,
  cursorToIndex,
  connectionFromArray
} from 'common/utils'
import { AuthenticationError } from 'apollo-server'
import { GQLRecommendationTypeResolver } from 'definitions'

const resolvers: GQLRecommendationTypeResolver = {
  followeeArticles: async (
    { id }: { id: string },
    { input },
    { dataSources: { userService } }
  ) => {
    if (!id) {
      throw new AuthenticationError('visitor has no permission')
    }
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.countFolloweeArticles(id)
    return connectionFromPromisedArray(
      userService.followeeArticles({ userId: id, offset, limit: first }),
      input,
      totalCount
    )
  },
  hottest: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const where = id ? {} : { public: true }
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount(where)
    return connectionFromPromisedArray(
      articleService.recommendHottest({
        offset,
        limit: first,
        where
      }),
      input,
      totalCount
    )
  },
  newest: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const where = id ? {} : { public: true }
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount(where)
    return connectionFromPromisedArray(
      articleService.recommendNewest({
        offset,
        limit: first,
        where
      }),
      input,
      totalCount
    )
  },
  today: async (_, __, { dataSources: { articleService } }) => {
    const [article] = await articleService.recommendToday({
      offset: 0,
      limit: 1
    })
    return article
  },
  icymi: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const where = id ? {} : { public: true }
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.countRecommendIcymi(where)
    return connectionFromPromisedArray(
      articleService.recommendIcymi({
        offset,
        limit: first,
        where
      }),
      input,
      totalCount
    )
  },
  topics: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const { first, after } = input
    const where = id ? {} : { public: true }
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount(where)
    return connectionFromPromisedArray(
      articleService.recommendTopics({
        offset,
        limit: first,
        where
      }),
      input,
      totalCount
    )
  },
  tags: async ({ id }, { input }, { dataSources: { tagService } }) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await tagService.baseCount()
    return connectionFromPromisedArray(
      tagService.recommendTags({
        offset,
        limit: first
      }),
      input,
      totalCount
    )
  },
  authors: async ({ id }, { input }, { dataSources: { userService } }) => {
    const randomDraw = 5

    const { first, after, filter } = input

    let notIn = []
    if (filter && typeof filter.followed === typeof true) {
      notIn = await userService.findFollowees({ userId: id, limit: 999 }) // TODO: move this logic to db layer
    }

    if (filter && filter.random) {
      const authors = await userService.recommendAuthor({
        limit: 50,
        notIn
      })

      return connectionFromArray(sampleSize(authors, randomDraw), input)
    }

    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.baseCount()
    return connectionFromPromisedArray(
      userService.recommendAuthor({
        offset,
        limit: first
      }),
      input,
      totalCount
    )
  }
}

export default resolvers
