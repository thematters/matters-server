import { toGlobalId, connectionFromArray } from 'common/utils'
import {
  GQLQueryTypeResolver,
  GQLUserTypeResolver,
  GQLRecommendationTypeResolver,
  GQLUserInfoTypeResolver,
  GQLUserSettingsTypeResolver,
  GQLUserActivityTypeResolver,
  GQLMATTypeResolver,
  GQLLIKETypeResolver,
  GQLTransactionTypeResolver,
  GQLUserStatusTypeResolver,
  GQLUserOSSTypeResolver
} from 'definitions'

import rootUser from './rootUser'
import subscriptions from './subscriptions'
import followers from './followers'
import followees from './followees'
import isFollower from './isFollower'
import isFollowee from './isFollowee'
import likerId from './likerId'
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
import totalWordCount from './totalWordCount'
import unreadNoticeCount from './unreadNoticeCount'
import unreadFolloweeArticles from './unreadFolloweeArticles'
import unreadResponseInfoPopUp from './unreadResponseInfoPopUp'
import Recommendation from './recommendation'
import { MAT, Transaction } from './transaction'
import { boost, score } from './oss'
import profileCover from './profileCover'
import LIKE from './like'

const user: {
  Query: GQLQueryTypeResolver
  User: GQLUserTypeResolver
  Recommendation: GQLRecommendationTypeResolver
  UserInfo: GQLUserInfoTypeResolver
  UserSettings: GQLUserSettingsTypeResolver
  UserActivity: GQLUserActivityTypeResolver
  MAT: GQLMATTypeResolver
  LIKE: GQLLIKETypeResolver
  Transaction: GQLTransactionTypeResolver
  UserStatus: GQLUserStatusTypeResolver
  UserOSS: GQLUserOSSTypeResolver
} = {
  Query: {
    viewer: (root, _, { viewer }) => viewer,
    user: rootUser
  },
  User: {
    id: ({ id }) => (id ? toGlobalId({ type: 'User', id }) : ''),
    avatar,
    likerId,
    info: root => root,
    settings: root => root,
    status: root => (root.id ? root : null),
    activity: root => root,
    recommendation: root => root,
    oss: root => root,
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
    email: ({ email }) => email && email.replace(/#/g, '@'),
    totalWordCount,
    profileCover
  },
  UserSettings: {
    language: ({ language }, _, { viewer }) => language,
    notification
  },
  UserActivity,
  MAT,
  LIKE,
  Transaction,
  UserStatus: {
    MAT: root => root,
    LIKE: root => root,
    // TODO: remove field in OSS
    invitation: () => ({
      reward: null,
      left: null,
      sent: connectionFromArray([], {})
    }),
    articleCount,
    // viewCount,
    draftCount,
    commentCount,
    // quotationCount
    followerCount,
    followeeCount,
    subscriptionCount,
    unreadNoticeCount,
    unreadFolloweeArticles,
    unreadResponseInfoPopUp,
    totalWordCount
  },
  UserOSS: {
    boost,
    score
  }
}

export default user
