import type {
  GQLAppreciationResolvers,
  GQLCryptoWalletResolvers,
  GQLFollowingActivityResolvers,
  GQLFollowingResolvers,
  GQLLikerResolvers,
  GQLQueryResolvers,
  GQLRecommendationResolvers,
  GQLStripeAccountResolvers,
  GQLTransactionTargetResolvers,
  GQLTransactionResolvers,
  GQLUserActivityResolvers,
  GQLUserAnalyticsResolvers,
  GQLUserInfoResolvers,
  GQLUserOssResolvers,
  GQLUserSettingsResolvers,
  GQLUserStatusResolvers,
  GQLUserResolvers,
  GQLWalletResolvers,
  GQLCollectionResolvers,
  GQLPinnableWorkResolvers,
} from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

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
import pinnedWorks from './pinnedWorks'
import profileCover from './profileCover'
import receivedDonationCount from './receivedDonationCount'
import Recommendation from './recommendation'
import rootUser from './rootUser'
import socialAccounts from './socialAccounts'
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
  Query: GQLQueryResolvers

  User: GQLUserResolvers
  UserInfo: GQLUserInfoResolvers
  UserSettings: GQLUserSettingsResolvers
  UserActivity: GQLUserActivityResolvers
  UserAnalytics: GQLUserAnalyticsResolvers
  UserStatus: GQLUserStatusResolvers
  Appreciation: GQLAppreciationResolvers

  Following: GQLFollowingResolvers
  FollowingActivity: GQLFollowingActivityResolvers

  Recommendation: GQLRecommendationResolvers

  Liker: GQLLikerResolvers

  UserOSS: GQLUserOssResolvers

  Wallet: GQLWalletResolvers
  Transaction: GQLTransactionResolvers
  TransactionTarget: GQLTransactionTargetResolvers
  PinnableWork: GQLPinnableWorkResolvers
  StripeAccount: GQLStripeAccountResolvers

  CryptoWallet: GQLCryptoWalletResolvers
  Collection: GQLCollectionResolvers
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
    pinnedWorks,
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
    emailVerified: ({ emailVerified }) => emailVerified || false,
    profileCover,
    group,
    isWalletAuth,
    cryptoWallet,
    featuredTags,
    socialAccounts,
  },
  UserSettings: {
    language: ({ language }) => language || 'zh_hant',
    currency: ({ currency }) => currency || 'USD',
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
    hasEmailLoginPassword: ({ passwordHash }) => passwordHash !== null,
  },
  Appreciation,

  Following,
  FollowingActivity: {
    __resolveType: ({ __type }: any) => __type,
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
  // @ts-ignore
  TransactionTarget,
  PinnableWork: {
    __resolveType: ({ __type }: any) => __type,
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
