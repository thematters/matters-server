import { sampleSize } from 'lodash'
import {
  connectionFromPromisedArray,
  cursorToIndex,
  connectionFromArray
} from 'common/utils'
import { GQLRecommendationTypeResolver } from 'definitions'
import { ForbiddenError, AuthenticationError } from 'common/errors'

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
  hottest: async (
    { id },
    { input },
    { viewer, dataSources: { articleService } }
  ) => {
    const { oss = false } = input

    if (oss) {
      if (!viewer.hasRole('admin')) {
        throw new ForbiddenError('only admin can access oss')
      }
    }

    let where = {}
    if (!id) {
      where = { ...where, 'article.public': true }
    }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.countRecommendHottest({
      where: id ? {} : { public: true },
      oss
    })
    return connectionFromPromisedArray(
      articleService.recommendHottest({
        offset,
        limit: first,
        where,
        oss
      }),
      input,
      totalCount
    )
  },
  newest: async (
    { id },
    { input },
    { viewer, dataSources: { articleService } }
  ) => {
    const { oss = false } = input

    if (oss) {
      if (!viewer.hasRole('admin')) {
        throw new ForbiddenError('only admin can access oss')
      }
    }

    let where = {}

    if (!id) {
      where = { ...where, public: true }
    }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.countRecommendNewest({
      where,
      oss
    })

    return connectionFromPromisedArray(
      articleService.recommendNewest({
        offset,
        limit: first,
        where,
        oss
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
  topics: async (
    { id },
    { input },
    { dataSources: { articleService }, viewer }
  ) => {
    const { oss = false } = input

    if (oss) {
      if (!viewer.hasRole('admin')) {
        throw new ForbiddenError('only admin can access oss')
      }
    }

    const { first, after } = input
    const where = id ? {} : { 'article.public': true }
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount(where)
    return connectionFromPromisedArray(
      articleService.recommendTopics({
        offset,
        limit: first,
        where,
        oss
      }),
      input,
      totalCount
    )
  },
  tags: async ({ id }, { input }, { dataSources: { tagService }, viewer }) => {
    const { oss = false } = input

    if (oss) {
      if (!viewer.hasRole('admin')) {
        throw new ForbiddenError('only admin can access oss')
      }
    }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await tagService.baseCount()
    return connectionFromPromisedArray(
      tagService.recommendTags({
        offset,
        limit: first,
        oss
      }),
      input,
      totalCount
    )
  },
  authors: async (
    { id },
    { input },
    { dataSources: { userService }, viewer }
  ) => {
    const { oss = false } = input

    if (oss) {
      if (!viewer.hasRole('admin')) {
        throw new ForbiddenError('only admin can access oss')
      }
    }

    const randomDraw = 5

    const { first, after, filter } = input

    let notIn: any = []
    if (filter && filter.followed === false) {
      // TODO: move this logic to db layer
      if (id) {
        const followees = await userService.findFollowees({
          userId: id,
          limit: 999
        })
        notIn = followees.map(({ targetId }: any) => targetId)
      }
    }

    if (filter && filter.random) {
      const authors = await userService.recommendAuthor({
        limit: 50,
        notIn,
        oss
      })

      return connectionFromArray(sampleSize(authors, randomDraw), input)
    }

    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.baseCount()

    return connectionFromPromisedArray(
      userService.recommendAuthor({
        offset,
        notIn,
        limit: first
      }),
      input,
      totalCount
    )
  }
}

export default resolvers
