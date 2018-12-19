// external
import { sum } from 'lodash'
import { BatchParams, Context } from 'definitions'
import { toGlobalId, fromGlobalId } from 'common/utils'

export default {
  Query: {
    viewer: (root: any, _: any, { viewer }: Context) => viewer
  },
  User: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'User', id })
    },
    info: (root: any) => root,
    user: (
      root: any,
      { input: { id } }: { input: { id: string } },
      { userService }: Context
    ) => {
      const { id: dbID } = fromGlobalId(id)
      return userService.idLoader.load(dbID)
    },
    // hasFollowed,
    // drafts,
    // audioDrafts,
    subscriptions: async (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { articleService, userService }: Context
    ) => {
      const actions = await userService.findSubscriptionsInBatch(
        id,
        offset,
        limit
      )
      return articleService.idLoader.loadMany(
        actions.map(({ targetId }) => targetId)
      )
    },
    // quotations,

    // activity,
    followers: async (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => {
      const actions = await userService.findFollowersInBatch(id, offset, limit)
      return userService.baseFindByIds(actions.map(({ userId }) => userId))
    },
    followees: async (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => {
      const actions = await userService.findFollowees({ id, offset, limit })

      return userService.baseFindByIds(
        actions.map(({ targetId }: { targetId: number }) => targetId)
      )
    },
    notices: ({ id }: { id: number }, _: any, { userService }: Context) => null,
    settings: (root: any) => root,
    status: (root: any) => root
  },
  Notice: {
    __resolveType: () => 'UserNotice'
  },
  UserSettings: {
    // language: ({ language }: { language: string }) => language,
    oauthType: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.findOAuthTypes(id),
    notification: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.findNotifySetting(id)
  },
  UserStatus: {
    articleCount: async (
      { id }: { id: string },
      _: any,
      { articleService }: Context
    ) => articleService.countByAuthor(id),
    MAT: async (
      { id }: { id: string },
      _: any,
      { articleService }: Context
    ) => {
      const articles = await articleService.findByAuthor(id)
      const apprecations = await Promise.all(
        articles.map(({ id }: { id: string }) =>
          articleService.countAppreciation(id)
        )
      )
      return sum(apprecations)
    },
    // viewCount,
    // draftCount,
    commentCount: (
      { id }: { id: number },
      _: any,
      { commentService }: Context
    ) => commentService.countByAuthor(id),
    // quotationCount
    followerCount: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.countFollowers(id),
    followeeCount: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.countFollowees(id),
    subscriptionCount: (
      { id }: { id: number },
      _: any,
      { userService }: Context
    ) => userService.countSubscription(id)
  }
}
