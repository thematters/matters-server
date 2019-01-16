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
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount()
    return connectionFromPromisedArray(
      articleService.recommendHottest({
        offset,
        limit: first,
        where: id ? {} : { public: true }
      }),
      input,
      totalCount
    )
  },
  newest: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount()
    return connectionFromPromisedArray(
      articleService.recommendNewest({
        offset,
        limit: first,
        where: id ? {} : { public: true }
      }),
      input,
      totalCount
    )
  },
  icymi: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount()
    return connectionFromPromisedArray(
      articleService.recommendIcymi({
        offset,
        limit: first,
        where: id ? {} : { public: true }
      }),
      input,
      totalCount
    )
  },
  topics: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount()
    return connectionFromPromisedArray(
      articleService.recommendTopics({
        offset,
        limit: first,
        where: id ? {} : { public: true }
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
