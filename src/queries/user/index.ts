import { NODE_TYPES } from 'common/enums/index.js'
import { toGlobalId } from 'common/utils/index.js'
import {
  GQLAppreciationTypeResolver,
  GQLCryptoWalletTypeResolver,
  GQLFollowingActivityTypeResolver,
  GQLFollowingTypeResolver,
  GQLLikerTypeResolver,
  GQLPossibleFollowingActivityTypeNames,
  GQLQueryTypeResolver,
  GQLQuoteCurrency,
  GQLRecommendationTypeResolver,
  GQLStripeAccountTypeResolver,
  GQLTransactionTargetTypeResolver,
  GQLTransactionTypeResolver,
  GQLUserActivityTypeResolver,
  GQLUserAnalyticsTypeResolver,
  GQLUserInfoTypeResolver,
  GQLUserLanguage,
  GQLUserOSSTypeResolver,
  GQLUserSettingsTypeResolver,
  GQLUserStatusTypeResolver,
  GQLUserTypeResolver,
  GQLWalletTypeResolver,
} from 'definitions'

import UserAnalytics from './analytics/index.js'
import { Appreciation } from './appreciation.js'
import articleCount from './articleCount.js'
import avatar from './avatar.js'
import badges from './badges.js'
import blockList from './blockList.js'
import commentCount from './commentCount.js'
import cryptoWallet from './cryptoWallet.js'
import donatedArticleCount from './donatedArticleCount.js'
import featuredTags from './featuredTags.js'
import followers from './followers.js'
import Following from './following/index.js'
import group from './group.js'
import hasPaymentPassword from './hasPaymentPassword.js'
import ipnsKey from './ipnsKey.js'
import isBlocked from './isBlocked.js'
import isBlocking from './isBlocking.js'
import isFollowee from './isFollowee.js'
import isFollower from './isFollower.js'
import isWalletAuth from './isWalletAuth.js'
import Liker from './liker/index.js'
import likerId from './liker/likerId.js'
import { hasNFTs, nfts } from './nfts.js'
import notification from './notification.js'
import { boost, score } from './oss.js'
import ownCircles from './ownCircles.js'
import profileCover from './profileCover.js'
import receivedDonationCount from './receivedDonationCount.js'
import Recommendation from './recommendation/index.js'
import rootUser from './rootUser.js'
import StripeAccount from './stripeAccount/index.js'
import subscribedCircles from './subscribedCircles.js'
import subscriptions from './subscriptions.js'
import maintainedTags from './tags/maintainedTags.js'
import pinnedTags from './tags/pinnedTags.js'
import tagsUsageRecommendation from './tags/tagsUsageRecommendation.js'
import totalWordCount from './totalWordCount.js'
import { Transaction, TransactionTarget } from './transaction.js'
import unreadFollowing from './unreadFollowing.js'
import unreadNoticeCount from './unreadNoticeCount.js'
import UserActivity from './userActivity.js'
import userNameEditable from './userNameEditable.js'
import Wallet from './wallet/index.js'

const user: {
  Query: GQLQueryTypeResolver

  User: GQLUserTypeResolver
  UserInfo: GQLUserInfoTypeResolver
  UserSettings: GQLUserSettingsTypeResolver
  UserActivity: GQLUserActivityTypeResolver
  UserAnalytics: GQLUserAnalyticsTypeResolver
  UserStatus: GQLUserStatusTypeResolver
  Appreciation: GQLAppreciationTypeResolver

  Following: GQLFollowingTypeResolver
  FollowingActivity: {
    __resolveType: GQLFollowingActivityTypeResolver
  }

  Recommendation: GQLRecommendationTypeResolver

  Liker: GQLLikerTypeResolver

  UserOSS: GQLUserOSSTypeResolver

  Wallet: GQLWalletTypeResolver
  Transaction: GQLTransactionTypeResolver
  TransactionTarget: {
    __resolveType: GQLTransactionTargetTypeResolver
  }
  StripeAccount: GQLStripeAccountTypeResolver

  CryptoWallet: GQLCryptoWalletTypeResolver
} = {
  Query: {
    viewer: (root, _, { viewer }) => viewer,
    user: rootUser,
  },
  User: {
    id: ({ id }) => (id ? toGlobalId({ type: NODE_TYPES.User, id }) : ''),
    avatar,
    likerId,
    liker: (root) => root,
    info: (root) => root,
    // ipnsAddress,
    wallet: (root) => root,
    settings: (root) => root,
    status: (root) => (root.id ? root : null),
    activity: (root) => root,
    following: (root) => root,
    analytics: (root) => root,
    recommendation: (root) => root,
    oss: (root) => root,
    // hasFollowed,
    subscriptions,
    followers,
    isFollower,
    isFollowee,
    blockList,
    isBlocking,
    isBlocked,
    ownCircles,
    subscribedCircles,
    maintainedTags,
    pinnedTags,
    tags: tagsUsageRecommendation,
  },
  UserInfo: {
    ipnsKey,
    badges,
    userNameEditable,
    email: ({ email }) => email && email.replace(/#/g, '@'),
    profileCover,
    group,
    isWalletAuth,
    cryptoWallet,
    featuredTags,
  },
  UserSettings: {
    language: ({ language }) => language || ('zh_hant' as GQLUserLanguage),
    currency: ({ currency }) => currency || ('USD' as GQLQuoteCurrency),
    notification,
  },
  UserActivity,
  UserAnalytics,
  UserStatus: {
    articleCount,
    commentCount,
    unreadNoticeCount,
    unreadFollowing,
    hasPaymentPassword,
    totalWordCount,
    donatedArticleCount,
    receivedDonationCount,
  },
  Appreciation,

  Following,
  FollowingActivity: {
    __resolveType: ({
      __type,
    }: {
      __type: GQLPossibleFollowingActivityTypeNames
    }) => __type,
  },

  Recommendation,

  // LikeCoin
  Liker,

  // OSS
  UserOSS: {
    boost,
    score,
  },

  // Payment
  Wallet,
  Transaction,
  TransactionTarget,
  StripeAccount,

  CryptoWallet: {
    id: ({ id }) =>
      id ? toGlobalId({ type: NODE_TYPES.CryptoWallet, id }) : '',
    address: ({ address }) => address,
    // createdAt: ({ createdAt }) => createdAt,

    hasNFTs,
    nfts,
  },
}

export default user
