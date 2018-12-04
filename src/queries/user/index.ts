import { Context } from 'src/definitions'

import followers from './followers'
import follows from './follows'
import followCount from './followCount'
import followerCount from './followCount'

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
    followers,
    follows,
    notices: ({ id }: { id: number }, _: any, { userService }: Context) => null,
    settings: (root: any) => root,
    status: (root: any) => root
  },
  Notice: {
    __resolveType(): string {
      return 'UserNotice'
    }
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
    followCount,
    followerCount
    // subscriptionCount
  }
}
