import { Context } from 'definitions'
import { toGlobalId } from 'common/utils'

import rootUser from './rootUser'
import subscriptions from './subscriptions'
import followers from './followers'
import followees from './followees'
import isFollower from './isFollower'
import isFollowee from './isFollowee'
import avatar from './avatar'
import badges from './badges'
import userNameEditable from './userNameEditable'
import articleCount from './articleCount'
import draftCount from './draftCount'
import commentCount from './commentCount'
// import oauthType from './oauthType'
import UserActivity from './userActivity'
import notification from './notification'
import followerCount from './followerCount'
import followeeCount from './followeeCount'
import subscriptionCount from './subscriptionCount'
import unreadNoticeCount from './unreadNoticeCount'
import Recommendation from './recommendation'
import invitationLeft from './invitationLeft'
import invitationSent from './invitationSent'
import invitationRecipient from './invitationRecipient'
import invitationAccepted from './invitationAccepted'
import invitationReward from './invitationReward'
import { MAT, Transaction } from './transaction'
import { boost, score } from './oss'

export default {
  Query: {
    viewer: (root: any, _: any, { viewer }: Context) => viewer,
    user: rootUser
  },
  User: {
    id: ({ id }: { id: string }) =>
      id ? toGlobalId({ type: 'User', id }) : '',
    avatar,
    info: (root: any) => root,
    settings: (root: any) => root,
    status: (root: any) => root,
    activity: (root: any) => root,
    recommendation: (root: any) => root,
    oss: (root: any) => root,
    // hasFollowed,
    subscriptions,
    // quotations,
    followers,
    followees,
    isFollower,
    isFollowee
  },
  Recommendation,
  UserInfo: {
    avatar,
    badges,
    userNameEditable,
    email: ({ email }: { email: string }) => email && email.replace(/#/g, '@')
  },
  UserSettings: {
    // oauthType,
    notification
  },
  UserActivity,
  MAT,
  Transaction,
  UserStatus: {
    MAT: (root: any) => root,
    invitation: (root: any) => root,
    articleCount,
    // viewCount,
    draftCount,
    commentCount,
    // quotationCount
    followerCount,
    followeeCount,
    subscriptionCount,
    unreadNoticeCount
  },
  InvitationStatus: {
    reward: invitationReward,
    left: invitationLeft,
    sent: invitationSent
  },
  Invitation: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Invitation', id }),
    user: invitationRecipient,
    accepted: invitationAccepted
  },
  UserOSS: {
    boost,
    score
  }
}
