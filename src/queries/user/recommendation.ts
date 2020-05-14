import { CacheScope } from 'apollo-cache-control'
import { last, sampleSize } from 'lodash'

import { ARTICLE_STATE, CACHE_TTL } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import logger from 'common/logger'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
  fromGlobalId,
  loadManyFilterError,
  toGlobalId,
} from 'common/utils'
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
  followeeWorks: async (
    { id }: { id: string },
    { input },
    { dataSources: { articleService, commentService, userService } }
  ) => {
    if (!id) {
      throw new AuthenticationError('visitor has no permission')
    }

    const after = input.after ? fromGlobalId(input.after).id : null
    const [sources, range] = await Promise.all([
      userService.findFolloweeWorks({ after, userId: id, limit: input.first }),
      userService.findFolloweeWorksRange({ userId: id }),
    ])

    // fetch followee works
    const items = (await Promise.all(
      sources.map((source: { [key: string]: any }) => {
        switch (source.type) {
          case 'Article': {
            return articleService.dataloader.load(source.id)
          }
          case 'Comment': {
            return commentService.dataloader.load(source.id)
          }
          default: {
            return new Promise((resolve) => resolve(undefined))
          }
        }
      })
    )) as Array<
      | {
          [key: string]: any
        }
      | undefined
    >

    // re-process items
    const cleanedItems = items.filter((item) => item) as Array<{
      [key: string]: any
    }>

    const edges = cleanedItems.map((item) => {
      const type = !!item.title ? 'Article' : 'Comment'
      return {
        cursor: toGlobalId({ type, id: item.id }),
        node: { __type: type, ...item },
      }
    })

    // handle page info
    const head = sources[0] as { [key: string]: any }
    const headSeq = head && parseInt(head.seq, 10)

    const tail = last(sources) as { [key: string]: any }
    const tailSeq = tail && parseInt(tail.seq, 10)

    const edgeHead = edges[0]
    const edgeTail = last(edges)

    return {
      edges,
      pageInfo: {
        startCursor: edgeHead ? edgeHead.cursor : '',
        endCursor: edgeTail ? edgeTail.cursor : '',
        hasPreviousPage: headSeq < range.max,
        hasNextPage: tailSeq > range.min,
      },
      totalCount: range.count,
    }
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

    const where = { 'article.state': ARTICLE_STATE.active } as {
      [key: string]: any
    }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.countRecommendHottest({
      where: id ? {} : where,
      oss,
    })
    return connectionFromPromisedArray(
      articleService.recommendHottest({
        offset,
        limit: first,
        where,
        oss,
        group: viewer.group,
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

    const where = { state: ARTICLE_STATE.active } as { [key: string]: any }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.countRecommendNewest({
      where,
      oss,
    })

    return connectionFromPromisedArray(
      articleService.recommendNewest({
        offset,
        limit: first,
        where,
        oss,
      }),
      input,
      totalCount
    )
  },
  icymi: async ({ id }, { input }, { dataSources: { articleService } }) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1

    const [totalCount, articles] = await Promise.all([
      articleService.countRecommendIcymi(),
      articleService.recommendIcymi({
        offset,
        limit: first,
      }),
    ])
    return connectionFromArray(articles, input, totalCount)
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
    const where = { 'article.state': ARTICLE_STATE.active }
    const offset = cursorToIndex(after) + 1
    const totalCount = await articleService.baseCount(where)
    return connectionFromPromisedArray(
      articleService.recommendTopics({
        offset,
        limit: first,
        where,
        oss,
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
        oss,
      }),
      input,
      totalCount
    )
  },
  authors: async (
    { id },
    { input },
    { dataSources: { userService }, viewer },
    { cacheControl }
  ) => {
    const { oss = false } = input

    if (oss) {
      if (!viewer.hasRole('admin')) {
        throw new ForbiddenError('only admin can access oss')
      }
    }

    const { first, after, filter } = input

    const randomDraw = first || 5

    let notIn: any[] = id ? [id] : []
    if (filter && filter.followed === false) {
      // TODO: move this logic to db layer
      if (id) {
        const followees = await userService.findFollowees({
          userId: id,
          limit: 999,
        })
        notIn = [...notIn, ...followees.map(({ targetId }: any) => targetId)]
      }
    }

    if (filter && filter.random) {
      cacheControl.setCacheHint({
        maxAge: CACHE_TTL.INSTANT,
        scope: CacheScope.Private,
      })
      const authors = await userService.recommendAuthor({
        limit: 50,
        notIn,
        oss,
      })

      return connectionFromArray(sampleSize(authors, randomDraw), input)
    }

    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.countAuthor({
      notIn,
    })

    return connectionFromPromisedArray(
      userService.recommendAuthor({
        offset,
        notIn,
        limit: first,
      }),
      input,
      totalCount
    )
  },
  recommendArticles: async (
    { id }: { id: string },
    { input },
    { dataSources: { userService, articleService } }
  ) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1

    // fallback to icymi
    const fallback = async () => {
      const [totalCount, articles] = await Promise.all([
        articleService.countRecommendIcymi(),
        articleService.recommendIcymi({
          offset,
          limit: first,
        }),
      ])
      return connectionFromArray(articles, input, totalCount)
    }

    // fallback for visitors
    if (!id) {
      return fallback
    }

    // exclude last 10000 articles already read by this user
    const readHistory = await userService.findReadHistory({
      userId: id,
      limit: 10000,
    })
    const readHistoryIds = readHistory.map(({ article }) => article.id)
    try {
      const recommendedArtices = await userService.recommendItems({
        userId: id,
        itemIndex: 'article',
        first,
        offset,
        notIn: readHistoryIds,
      })

      const ids = recommendedArtices.map(({ id: aid }: { id: any }) => aid)

      // get articles
      const [totalCount, articles] = await Promise.all([
        articleService.baseCount({ state: ARTICLE_STATE.active }),
        articleService.dataloader.loadMany(ids).then(loadManyFilterError),
      ])

      if (!articles || articles.length === 0) {
        return fallback
      }
      return connectionFromArray(articles, input, totalCount)
    } catch (err) {
      logger.error(
        `error in recommendation to user via ES: ${JSON.stringify(err)}`
      )
      return fallback
    }
  },
}

export default resolvers
