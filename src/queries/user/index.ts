import { Context } from 'src/definitions'

import followers from './followers'
import follows from './follows'
import {
  gravity,
  MAT,
  articleCount,
  commentCount,
  followCount,
  followerCount
} from './status'
import notices from './notices'

export default {
  Query: {
    user: (root: any, { id }: { id: string }, { userService }: Context) =>
      userService.loader.load(id)
  },
  User: {
    info: (root: any) => root,
    settings: (
      { id, language }: { id: number; language: string },
      _: any,
      { userService }: Context
    ) => ({
      language,
      ...userService.findSettingByUserId(id)
    }),
    // recommnedation,
    // hasFollowed,
    // drafts,
    // audioDrafts,
    // citations,
    // subscriptions,
    // activity,
    followers,
    follows,
    status: (root: any) => root,
    notices
  },
  Notice: {
    __resolveType(): string {
      return 'UserNotice'
    }
  },
  UserStatus: {
    gravity,
    MAT,
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
