import { NODE_TYPES } from 'common/enums'
import { environment, isLocal } from 'common/environment'
import { toGlobalId } from 'common/utils'
import OpenSeaService from 'connectors/opensea'
import {
  GQLAppreciationTypeResolver,
  GQLCryptoWalletTypeResolver,
  GQLFollowingActivityTypeResolver,
  GQLFollowingTypeResolver,
  GQLLikerTypeResolver,
  GQLPossibleFollowingActivityTypeNames,
  GQLQueryTypeResolver,
  GQLRecommendationTypeResolver,
  GQLStripeAccountTypeResolver,
  GQLTransactionTargetTypeResolver,
  GQLTransactionTypeResolver,
  GQLUserActivityTypeResolver,
  GQLUserInfoTypeResolver,
  GQLUserOSSTypeResolver,
  GQLUserSettingsTypeResolver,
  GQLUserStatusTypeResolver,
  GQLUserTypeResolver,
  GQLWalletTypeResolver,
} from 'definitions'

import { Appreciation } from './appreciation'
import articleCount from './articleCount'
import avatar from './avatar'
import badges from './badges'
import blockList from './blockList'
import commentCount from './commentCount'
import cryptoWallet from './cryptoWallet'
import donatedArticleCount from './donatedArticleCount'
import followers from './followers'
import Following from './following'
import group from './group'
import hasPaymentPassword from './hasPaymentPassword'
import isBlocked from './isBlocked'
import isBlocking from './isBlocking'
import isFollowee from './isFollowee'
import isFollower from './isFollower'
import Liker from './liker'
import likerId from './liker/likerId'
import notification from './notification'
import { boost, score } from './oss'
import ownCircles from './ownCircles'
import profileCover from './profileCover'
import receivedDonationCount from './receivedDonationCount'
import Recommendation from './recommendation'
import rootUser from './rootUser'
import StripeAccount from './stripeAccount'
import subscribedCircles from './subscribedCircles'
import subscriptions from './subscriptions'
import totalWordCount from './totalWordCount'
import { Transaction, TransactionTarget } from './transaction'
import unreadFollowing from './unreadFollowing'
import unreadNoticeCount from './unreadNoticeCount'
import UserActivity from './userActivity'
import userNameEditable from './userNameEditable'
import Wallet from './wallet'

interface OpenSeaNFTAsset {
  id: number
  name: string
  description: string | null
  image_url: string
  image_preview_url: string
  image_thumbnail_url: string
  image_original_url: string
  asset_contract: Record<string, any>
  collection: Record<string, any>
  token_metadata: string
  permalink: string
}

const protocolScheme = isLocal ? 'http://' : 'https://'

const user: {
  Query: GQLQueryTypeResolver

  User: GQLUserTypeResolver
  UserInfo: GQLUserInfoTypeResolver
  UserSettings: GQLUserSettingsTypeResolver
  UserActivity: GQLUserActivityTypeResolver
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
    wallet: (root) => root,
    settings: (root) => root,
    status: (root) => (root.id ? root : null),
    activity: (root) => root,
    following: (root) => root,
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
  },
  UserInfo: {
    badges,
    userNameEditable,
    email: ({ email }) => email && email.replace(/#/g, '@'),
    profileCover,
    group,
    cryptoWallet,
  },
  UserSettings: {
    language: ({ language }, _, { viewer }) => language,
    notification,
  },
  UserActivity,
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
    createdAt: ({ createdAt }) => createdAt,
    nfts: async ({ address }) => {
      const oseaService = new OpenSeaService()
      const assets = await oseaService.getAssets({ owner: address })

      return assets
        .filter(
          // testnet takes longer to refresh
          // if no image_original_url, there's no way can show it
          ({ image_original_url }: OpenSeaNFTAsset) => !!image_original_url
        )
        .map(
          ({
            id,
            name,
            description,
            image_url,
            image_preview_url,
            image_thumbnail_url,
            image_original_url,
            asset_contract,
            collection,
            token_metadata,
            permalink,
          }: OpenSeaNFTAsset) => ({
            id: toGlobalId({ type: NODE_TYPES.CryptoWalletNFTAsset, id }),
            name,
            description,
            imageUrl: `${protocolScheme}${environment.domain}/img-cache/${image_url}`,
            imagePreviewUrl: `${protocolScheme}${environment.domain}/img-cache/${image_preview_url}`,
            // imageOriginalUrl: image_original_url || '',
            contractAddress: asset_contract.address,
            collectionName: collection.name,
            tokenMetadata: token_metadata,
            openseaPermalink: permalink,
          })
        )
    },
  },
}

export default user
