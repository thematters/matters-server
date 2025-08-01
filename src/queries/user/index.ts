import type {
  GQLAppreciationResolvers,
  GQLDonatorResolvers,
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
  GlobalId,
} from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import UserAnalytics from './analytics/index.js'
import { Appreciation } from './appreciation.js'
import articleCount from './articleCount.js'
import avatar from './avatar.js'
import badges from './badges.js'
import blockList from './blockList.js'
import bookmarkedArticles from './bookmarkedArticles.js'
import bookmarkedTags from './bookmarkedTags.js'
import campaigns from './campaigns.js'
import changeEmailTimesLeft from './changeEmailTimesLeft.js'
import Collection from './collection/index.js'
import collections from './collections.js'
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
import latestWorks from './latestWorks.js'
import Liker from './liker/index.js'
import likerId from './liker/likerId.js'
import momentCount from './momentCount.js'
import { hasNFTs, nfts } from './nfts.js'
import notification from './notification.js'
import { boost, featureFlags, restrictions, score } from './oss.js'
import ownCircles from './ownCircles.js'
import pinnedWorks from './pinnedWorks.js'
import profileCover from './profileCover.js'
import receivedDonationCount from './receivedDonationCount.js'
import Recommendation from './recommendation/index.js'
import rootUser from './rootUser.js'
import socialAccounts from './socialAccounts.js'
import StripeAccount from './stripeAccount/index.js'
import subscribedCircles from './subscribedCircles.js'
import tagsUsageRecommendation from './tags/tagsUsageRecommendation.js'
import totalWordCount from './totalWordCount.js'
import { Transaction, TransactionTarget } from './transaction.js'
import unreadFollowing from './unreadFollowing.js'
import unreadNoticeCount from './unreadNoticeCount.js'
import UserActivity from './userActivity.js'
import userNameEditable from './userNameEditable.js'
import Wallet from './wallet/index.js'
import writings from './writings.js'

const user: {
  Query: GQLQueryResolvers

  User: GQLUserResolvers
  UserInfo: GQLUserInfoResolvers
  UserSettings: GQLUserSettingsResolvers
  UserActivity: GQLUserActivityResolvers
  UserAnalytics: GQLUserAnalyticsResolvers
  UserStatus: GQLUserStatusResolvers
  Donator: GQLDonatorResolvers

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
    id: ({ id }) =>
      id ? toGlobalId({ type: NODE_TYPES.User, id }) : ('' as GlobalId),
    avatar,
    likerId,
    liker: (root) => root,
    info: (root) => root,
    wallet: (root) => root,
    settings: (root) => root,
    status: (root) => (root.id ? root : null),
    activity: (root) => root,
    following: (root) => root,
    analytics: (root) => root,
    recommendation: (root) => root,
    oss: (root) => root,
    bookmarkedArticles,
    bookmarkedTags,
    collections,
    latestWorks,
    pinnedWorks,
    followers,
    isFollower,
    isFollowee,
    blockList,
    isBlocking,
    isBlocked,
    ownCircles,
    subscribedCircles,
    tags: tagsUsageRecommendation,
    writings,
    campaigns,
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
    momentCount,
    commentCount,
    unreadNoticeCount,
    unreadFollowing,
    hasPaymentPassword,
    totalWordCount,
    totalReferredCount: ({ extra }) => extra?.referredCount || 0,
    donatedArticleCount,
    receivedDonationCount,
    changeEmailTimesLeft,
    hasEmailLoginPassword: ({ passwordHash }) => passwordHash !== null,
  },
  Donator: {
    __resolveType: ({ __type }: any) => __type,
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
    featureFlags,
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
    id: ({ address }) =>
      toGlobalId({ type: NODE_TYPES.CryptoWallet, id: address }),
    address: ({ address }) => address,
    hasNFTs,
    nfts,
  },

  Collection,
  Writing: {
    __resolveType: ({
      __type,
    }: {
      __type: NODE_TYPES.Article | NODE_TYPES.Moment
    }) => __type,
  },
}

export default user
