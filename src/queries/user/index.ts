import { Context } from 'src/definitions'

export default {
  Query: {
    user: (root: any, { uuid }: { uuid: string }, { userService }: Context) =>
      userService.uuidLoader.load(uuid)
  },
  User: {
    info: (root: any) => root,
    // recommnedation,
    // hasFollowed,
    // drafts,
    // audioDrafts,
    // citations,
    // subscriptions,
    // activity,
    followers: async (
      { id }: { id: number },
      _: any,
      { userService }: Context
    ) => {
      const actions = await userService.findFollowByTargetId(id)
      return userService.idLoader.loadMany(actions.map(({ userId }) => userId))
    },
    follows: async (
      { id }: { id: number },
      _: any,
      { userService }: Context
    ) => {
      const actions = await userService.findFollowByUserId(id)
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
      userService.findOAuthTypesByUserId(id),
    notification: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.findNotifySettingByUserId(id)
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
    // citationCount
    followerCount: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.countFollowByTargetId(id),
    followCount: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.countFollowByUserId(id)
    // subscriptionCount
  }
}
