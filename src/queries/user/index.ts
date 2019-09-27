import { connectionFromArray, toGlobalId } from 'common/utils'
import {
  GQLLIKETypeResolver,
  GQLMATTypeResolver,
  GQLQueryTypeResolver,
  GQLRecommendationTypeResolver,
  GQLTransactionTypeResolver,
  GQLUserActivityTypeResolver,
  GQLUserInfoTypeResolver,
  GQLUserOSSTypeResolver,
  GQLUserSettingsTypeResolver,
  GQLUserStatusTypeResolver,
  GQLUserTypeResolver
} from 'definitions'

import articleCount from './articleCount'
import avatar from './avatar'
import badges from './badges'
import commentCount from './commentCount'
import draftCount from './draftCount'
import followeeCount from './followeeCount'
import followees from './followees'
import followerCount from './followerCount'
import followers from './followers'
import isFollowee from './isFollowee'
import isFollower from './isFollower'
import LIKE from './like'
import likerId from './likerId'
import notification from './notification'
import { boost, score } from './oss'
import profileCover from './profileCover'
import Recommendation from './recommendation'
import rootUser from './rootUser'
import subscriptionCount from './subscriptionCount'
import subscriptions from './subscriptions'
import totalWordCount from './totalWordCount'
import { MAT, Transaction } from './transaction'
import unreadFolloweeArticles from './unreadFolloweeArticles'
import unreadNoticeCount from './unreadNoticeCount'
import unreadResponseInfoPopUp from './unreadResponseInfoPopUp'
// import oauthType from './oauthType'
import UserActivity from './userActivity'
import userNameEditable from './userNameEditable'

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
