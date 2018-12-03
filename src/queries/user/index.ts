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
import settings from './settings'

export default {
  Query: {
    user: (root: any, { id }: { id: string }, { userService }: Context) =>
      userService.uuidLoader.load(id)
  },
  User: {
    info: (root: any) => root,
    settings,
    // recommnedation,
    // hasFollowed,
    // drafts,
    // audioDrafts,
    // citations,
    // subscriptions,
    // activity,
    followers,
    follows,
    notices
    // status, // short hand for delegating resolver to UserStatusType
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
