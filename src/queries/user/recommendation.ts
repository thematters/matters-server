import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
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
    const { first, after } = input
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
