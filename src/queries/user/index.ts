import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
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
  GQLCollectionTypeResolver,
  GQLPinnableWorkTypeResolver,
  GQLPossiblePinnableWorkTypeNames,
} from 'definitions'

import UserAnalytics from './analytics'
import { Appreciation } from './appreciation'
import articleCount from './articleCount'
import avatar from './avatar'
import badges from './badges'
import blockList from './blockList'
import Collection from './collection'
import collections from './collections'
import commentCount from './commentCount'
import cryptoWallet from './cryptoWallet'
import donatedArticleCount from './donatedArticleCount'
import featuredTags from './featuredTags'
import followers from './followers'
import Following from './following'
import group from './group'
import hasPaymentPassword from './hasPaymentPassword'
import ipnsKey from './ipnsKey'
import isBlocked from './isBlocked'
import isBlocking from './isBlocking'
import isFollowee from './isFollowee'
import isFollower from './isFollower'
import isWalletAuth from './isWalletAuth'
import Liker from './liker'
import likerId from './liker/likerId'
import { hasNFTs, nfts } from './nfts'
import notification from './notification'
import { boost, restrictions, score } from './oss'
import ownCircles from './ownCircles'
import profileCover from './profileCover'
import receivedDonationCount from './receivedDonationCount'
import Recommendation from './recommendation'
import rootUser from './rootUser'
import StripeAccount from './stripeAccount'
import subscribedCircles from './subscribedCircles'
import subscriptions from './subscriptions'
import maintainedTags from './tags/maintainedTags'
import pinnedTags from './tags/pinnedTags'
import tagsUsageRecommendation from './tags/tagsUsageRecommendation'
import totalWordCount from './totalWordCount'
import { Transaction, TransactionTarget } from './transaction'
import unreadFollowing from './unreadFollowing'
import unreadNoticeCount from './unreadNoticeCount'
import UserActivity from './userActivity'
import userNameEditable from './userNameEditable'
import Wallet from './wallet'

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
  PinnableWork: {
    __resolveType: GQLPinnableWorkTypeResolver
  }
  StripeAccount: GQLStripeAccountTypeResolver

  CryptoWallet: GQLCryptoWalletTypeResolver
  Collection: GQLCollectionTypeResolver
} = {
  Query: {
    viewer: (_, __, { viewer }) => viewer,
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
    collections,
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
    restrictions,
  },

  // Payment
  Wallet,
  Transaction,
  TransactionTarget,
  PinnableWork: {
    __resolveType: ({ __type }: { __type: GQLPossiblePinnableWorkTypeNames }) =>
      __type,
  },
  StripeAccount,

  CryptoWallet: {
    id: ({ id }) =>
      id ? toGlobalId({ type: NODE_TYPES.CryptoWallet, id }) : '',
    address: ({ address }) => address,
    // createdAt: ({ createdAt }) => createdAt,

    hasNFTs,
    nfts,
  },

  Collection,
}

export default user
