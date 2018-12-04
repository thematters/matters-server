import { Context } from 'src/definitions'

import followers from './followers'
import follows from './follows'
import notices from './notices'

export default {
  Query: {
    user: (root: any, { uuid }: { uuid: string }, { userService }: Context) =>
      userService.uuidLoader.load(uuid)
  },
  User: {
<<<<<<< HEAD
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
    notices,
    settings: (root: any) => root,
    status: (root: any) => root
  },
  Notice: {
    __resolveType(): string {
      return 'UserNotice'
    }
  },
  UserSettings: {
    language: ({ language }: { language: string }) => language,
    oauthType: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.findOAuthTypesByUserId(id),
    notification: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.findNotifySettingByUserId(id)
  },
  UserStatus: {
    articleCount,
    // viewCount,
    // draftCount,
    commentCount,
    // citationCount
    followCount,
    followerCount
    // subscriptionCount
  }
}
