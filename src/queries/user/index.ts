import { BatchParams, Context } from 'definitions'

export default {
  Query: {
    user: (root: any, { uuid }: { uuid: string }, { userService }: Context) =>
      userService.uuidLoader.load(uuid),
    viewer: (root: any, _: any, { viewer }: Context) => viewer
  },
  User: {
    info: (root: any) => root,
    user: (root: any, { uuid }: { uuid: string }, { userService }: Context) =>
      userService.uuidLoader.load(uuid),
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
      return userService.idLoader.loadMany(actions.map(({ userId }) => userId))
    },
    followees: async (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => {
      const actions = await userService.findFolloweesInBatch(id, offset, limit)
      return userService.idLoader.loadMany(actions.map(({ userId }) => userId))
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
      { id }: { id: number },
      _: any,
      { articleService }: Context
    ) => articleService.countByAuthor(id),
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
