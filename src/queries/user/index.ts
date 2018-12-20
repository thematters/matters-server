import { Context } from 'definitions'
import { toGlobalId } from 'common/utils'

import subscriptions from './subscriptions'
import followers from './followers'
import followees from './followees'
import isFollower from './isFollower'
import isFollowee from './isFollowee'
import avatar from './avatar'
import articleCount from './articleCount'
import commentCount from './commentCount'
import MAT from './MAT'
import oauthType from './oauthType'
import notification from './notification'
import followerCount from './followerCount'
import followeeCount from './followeeCount'
import subscriptionCount from './subscriptionCount'
import unreadNoticeCount from './unreadNoticeCount'

export default {
  Query: {
    viewer: (root: any, _: any, { viewer }: Context) => viewer
  },
  User: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'User', id })
    },
    info: (root: any) => root,
    settings: (root: any) => root,
    status: (root: any) => root,
    activity: (root: any) => root,
    // hasFollowed,
    subscriptions,
    // quotations,
    followers,
    followees,
    isFollower,
    isFollowee
  },
  UserInfo: {
    avatar
  },
  UserSettings: {
    oauthType,
    notification
  },
  UserStatus: {
    articleCount,
    MAT,
    // viewCount,
    // draftCount,
    commentCount,
    // quotationCount
    followerCount,
    followeeCount,
    subscriptionCount,
    unreadNoticeCount
  }
}
