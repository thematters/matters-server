import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql'
import {
  User as UserModel,
  Wallet as WalletModel,
  OAuthClientDB as OAuthClientDBModel,
} from './user'
import { Tag as TagModel } from './tag'
import { Collection as CollectionModel } from './collection'
import { Comment as CommentModel } from './comment'
import {
  Article as ArticleModel,
  ArticleVersion as ArticleVersionModel,
} from './article'
import { Draft as DraftModel } from './draft'
import {
  Circle as CircleModel,
  CircleInvitation as CircleInvitationModel,
  CircleMember as CircleMemberModel,
} from './circle'
import {
  CirclePrice as CirclePriceModel,
  Transaction as TransactionModel,
  Writing as WritingModel,
  Context,
} from './index'
import { PayoutAccount as PayoutAccountModel } from './payment'
import { Asset as AssetModel } from './asset'
import { NoticeItem as NoticeItemModel } from './notification'
import { Appreciation as AppreciationModel } from './appreciation'
import { Report as ReportModel } from './report'
import { MattersChoiceTopic as MattersChoiceTopicModel } from './misc'
import { Moment as MomentModel } from './moment'
import {
  Campaign as CampaignModel,
  CampaignStage as CampaignStageModel,
} from './campaign'
export type Maybe<T> = T | null
export type InputMaybe<T> = T | undefined
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>
}
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>
}
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T
> = { [_ in K]?: never }
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  DateTime: { input: any; output: any }
  Upload: { input: any; output: any }
}

export type GQLAddArticlesTagsInput = {
  articles?: InputMaybe<Array<Scalars['ID']['input']>>
  id: Scalars['ID']['input']
  selected?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLAddCollectionsArticlesInput = {
  articles: Array<Scalars['ID']['input']>
  collections: Array<Scalars['ID']['input']>
}

export type GQLAddCreditInput = {
  amount: Scalars['Float']['input']
}

export type GQLAddCreditResult = {
  __typename?: 'AddCreditResult'
  /** The client secret of this PaymentIntent. */
  client_secret: Scalars['String']['output']
  transaction: GQLTransaction
}

export type GQLAnnouncement = {
  __typename?: 'Announcement'
  content?: Maybe<Scalars['String']['output']>
  cover?: Maybe<Scalars['String']['output']>
  createdAt: Scalars['DateTime']['output']
  expiredAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  link?: Maybe<Scalars['String']['output']>
  order: Scalars['Int']['output']
  title?: Maybe<Scalars['String']['output']>
  translations?: Maybe<Array<GQLTranslatedAnnouncement>>
  type: GQLAnnouncementType
  updatedAt: Scalars['DateTime']['output']
  visible: Scalars['Boolean']['output']
}

export type GQLAnnouncementType = 'community' | 'product' | 'seminar'

export type GQLAnnouncementsInput = {
  id?: InputMaybe<Scalars['ID']['input']>
  visible?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLApplyCampaignInput = {
  id: Scalars['ID']['input']
}

export type GQLAppreciateArticleInput = {
  amount: Scalars['Int']['input']
  id: Scalars['ID']['input']
  superLike?: InputMaybe<Scalars['Boolean']['input']>
  token?: InputMaybe<Scalars['String']['input']>
}

export type GQLAppreciation = {
  __typename?: 'Appreciation'
  amount: Scalars['Int']['output']
  content: Scalars['String']['output']
  /** Timestamp of appreciation. */
  createdAt: Scalars['DateTime']['output']
  purpose: GQLAppreciationPurpose
  /** Recipient of appreciation. */
  recipient: GQLUser
  /** Sender of appreciation. */
  sender?: Maybe<GQLUser>
  /** Object that appreciation is meant for. */
  target?: Maybe<GQLArticle>
}

export type GQLAppreciationConnection = GQLConnection & {
  __typename?: 'AppreciationConnection'
  edges?: Maybe<Array<GQLAppreciationEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLAppreciationEdge = {
  __typename?: 'AppreciationEdge'
  cursor: Scalars['String']['output']
  node: GQLAppreciation
}

export type GQLAppreciationPurpose =
  | 'appreciate'
  | 'appreciateComment'
  | 'appreciateSubsidy'
  | 'firstPost'
  | 'invitationAccepted'
  | 'joinByInvitation'
  | 'joinByTask'
  | 'systemSubsidy'

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticle = GQLNode &
  GQLPinnableWork & {
    __typename?: 'Article'
    /** Access related fields on circle */
    access: GQLArticleAccess
    /** Number represents how many times per user can appreciate this article. */
    appreciateLeft: Scalars['Int']['output']
    /** Limit the nuhmber of appreciate per user. */
    appreciateLimit: Scalars['Int']['output']
    /** Appreciations history of this article. */
    appreciationsReceived: GQLAppreciationConnection
    /** Total number of appreciations recieved of this article. */
    appreciationsReceivedTotal: Scalars['Int']['output']
    /** List of assets are belonged to this article (Only the author can access currently). */
    assets: Array<GQLAsset>
    /** Author of this article. */
    author: GQLUser
    /** Available translation languages. */
    availableTranslations?: Maybe<Array<GQLUserLanguage>>
    /** whether readers can comment */
    canComment: Scalars['Boolean']['output']
    /** This value determines if current viewer can SuperLike or not. */
    canSuperLike: Scalars['Boolean']['output']
    /** List of articles which added this article into their collections. */
    collectedBy: GQLArticleConnection
    /** List of articles added into this article' collection. */
    collection: GQLArticleConnection
    /** The counting number of comments. */
    commentCount: Scalars['Int']['output']
    /** List of comments of this article. */
    comments: GQLCommentConnection
    /** Content (HTML) of this article. */
    content: Scalars['String']['output']
    /** Different foramts of content. */
    contents: GQLArticleContents
    /** Article cover's link. */
    cover?: Maybe<Scalars['String']['output']>
    /** Time of this article was created. */
    createdAt: Scalars['DateTime']['output']
    /** IPFS hash of this article. */
    dataHash: Scalars['String']['output']
    /** whether current viewer has donated to this article */
    donated: Scalars['Boolean']['output']
    /** Total number of donation recieved of this article. */
    donationCount: Scalars['Int']['output']
    /** Donations of this article, grouped by sender */
    donations: GQLArticleDonationConnection
    /**
     * Drafts linked to this article.
     * @deprecated Use Article.newestUnpublishedDraft or Article.newestPublishedDraft instead
     */
    drafts?: Maybe<Array<GQLDraft>>
    /** List of featured comments of this article. */
    featuredComments: GQLCommentConnection
    /** This value determines if current viewer has appreciated or not. */
    hasAppreciate: Scalars['Boolean']['output']
    /** Unique ID of this article */
    id: Scalars['ID']['output']
    /** the iscnId if published to ISCN */
    iscnId?: Maybe<Scalars['String']['output']>
    /** Original language of content */
    language?: Maybe<Scalars['String']['output']>
    /** License Type */
    license: GQLArticleLicenseType
    /** Media hash, composed of cid encoding, of this article. */
    mediaHash: Scalars['String']['output']
    /** Newest published draft linked to this article. */
    newestPublishedDraft: GQLDraft
    /** Newest unpublished draft linked to this article. */
    newestUnpublishedDraft?: Maybe<GQLDraft>
    oss: GQLArticleOss
    /** The number determines how many comments can be set as pinned comment. */
    pinCommentLeft: Scalars['Int']['output']
    /** The number determines how many pinned comments can be set. */
    pinCommentLimit: Scalars['Int']['output']
    pinned: Scalars['Boolean']['output']
    /** List of pinned comments. */
    pinnedComments?: Maybe<Array<GQLComment>>
    /** Cumulative reading time in seconds */
    readTime: Scalars['Float']['output']
    /** Total number of readers of this article. */
    readerCount: Scalars['Int']['output']
    /** Related articles to this article. */
    relatedArticles: GQLArticleConnection
    /** Donation-related articles to this article. */
    relatedDonationArticles: GQLArticleConnection
    remark?: Maybe<Scalars['String']['output']>
    /** creator message after support */
    replyToDonator?: Maybe<Scalars['String']['output']>
    /** creator message asking for support */
    requestForDonation?: Maybe<Scalars['String']['output']>
    /** The counting number of this article. */
    responseCount: Scalars['Int']['output']
    /** List of responses of a article. */
    responses: GQLResponseConnection
    /** Time of this article was revised. */
    revisedAt?: Maybe<Scalars['DateTime']['output']>
    /** Revision Count */
    revisionCount: Scalars['Int']['output']
    /** whether content is marked as sensitive by admin */
    sensitiveByAdmin: Scalars['Boolean']['output']
    /** whether content is marked as sensitive by author */
    sensitiveByAuthor: Scalars['Boolean']['output']
    /** Short hash for shorter url addressing */
    shortHash: Scalars['String']['output']
    /** Slugified article title. */
    slug: Scalars['String']['output']
    /** State of this article. */
    state: GQLArticleState
    /**
     * This value determines if this article is an author selected article or not.
     * @deprecated Use pinned instead
     */
    sticky: Scalars['Boolean']['output']
    /** This value determines if current Viewer has subscribed of not. */
    subscribed: Scalars['Boolean']['output']
    /** Subscribers of this article. */
    subscribers: GQLUserConnection
    /** A short summary for this article. */
    summary: Scalars['String']['output']
    /** This value determines if the summary is customized or not. */
    summaryCustomized: Scalars['Boolean']['output']
    /** Tags attached to this article. */
    tags?: Maybe<Array<GQLTag>>
    /** Article title. */
    title: Scalars['String']['output']
    /** The number represents how popular is this article. */
    topicScore?: Maybe<Scalars['Int']['output']>
    /** Transactions history of this article. */
    transactionsReceivedBy: GQLUserConnection
    /** Translation of article title and content. */
    translation?: Maybe<GQLArticleTranslation>
    /** history versions */
    versions: GQLArticleVersionsConnection
    /** Word count of this article. */
    wordCount?: Maybe<Scalars['Int']['output']>
  }

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleAppreciationsReceivedArgs = {
  input: GQLConnectionArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleCollectedByArgs = {
  input: GQLConnectionArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleCollectionArgs = {
  input: GQLConnectionArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleCommentsArgs = {
  input: GQLCommentsInput
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleDonationsArgs = {
  input: GQLConnectionArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleFeaturedCommentsArgs = {
  input: GQLFeaturedCommentsInput
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleRelatedArticlesArgs = {
  input: GQLConnectionArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleRelatedDonationArticlesArgs = {
  input: GQLRelatedDonationArticlesInput
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleResponsesArgs = {
  input: GQLResponsesInput
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleSubscribersArgs = {
  input: GQLConnectionArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleTransactionsReceivedByArgs = {
  input: GQLTransactionsReceivedByArgs
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleTranslationArgs = {
  input?: InputMaybe<GQLTranslationArgs>
}

/**
 * This type contains metadata, content, hash and related data of an article. If you
 * want information about article's comments. Please check Comment type.
 */
export type GQLArticleVersionsArgs = {
  input: GQLArticleVersionsInput
}

export type GQLArticleAccess = {
  __typename?: 'ArticleAccess'
  circle?: Maybe<GQLCircle>
  secret?: Maybe<Scalars['String']['output']>
  type: GQLArticleAccessType
}

/** Enums for types of article access */
export type GQLArticleAccessType = 'paywall' | 'public'

export type GQLArticleArticleNotice = GQLNotice & {
  __typename?: 'ArticleArticleNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  article: GQLArticle
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLArticle
  type: GQLArticleArticleNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLArticleArticleNoticeType = 'ArticleNewCollected'

export type GQLArticleConnection = GQLConnection & {
  __typename?: 'ArticleConnection'
  edges?: Maybe<Array<GQLArticleEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLArticleContents = {
  __typename?: 'ArticleContents'
  /** HTML content of this article. */
  html: Scalars['String']['output']
  /** Markdown content of this article. */
  markdown: Scalars['String']['output']
}

export type GQLArticleDonation = {
  __typename?: 'ArticleDonation'
  id: Scalars['ID']['output']
  sender?: Maybe<GQLUser>
}

export type GQLArticleDonationConnection = {
  __typename?: 'ArticleDonationConnection'
  edges?: Maybe<Array<GQLArticleDonationEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLArticleDonationEdge = {
  __typename?: 'ArticleDonationEdge'
  cursor: Scalars['String']['output']
  node: GQLArticleDonation
}

export type GQLArticleEdge = {
  __typename?: 'ArticleEdge'
  cursor: Scalars['String']['output']
  node: GQLArticle
}

export type GQLArticleInput = {
  mediaHash?: InputMaybe<Scalars['String']['input']>
  shortHash?: InputMaybe<Scalars['String']['input']>
}

/** Enums for types of article license */
export type GQLArticleLicenseType =
  | 'arr'
  | 'cc_0'
  | 'cc_by_nc_nd_2'
  | 'cc_by_nc_nd_4'

export type GQLArticleNotice = GQLNotice & {
  __typename?: 'ArticleNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLArticle
  type: GQLArticleNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLArticleNoticeType =
  | 'ArticleMentionedYou'
  | 'ArticleNewAppreciation'
  | 'ArticleNewSubscriber'
  | 'ArticlePublished'
  | 'CircleNewArticle'
  | 'RevisedArticleNotPublished'
  | 'RevisedArticlePublished'

export type GQLArticleOss = {
  __typename?: 'ArticleOSS'
  boost: Scalars['Float']['output']
  inRecommendHottest: Scalars['Boolean']['output']
  inRecommendIcymi: Scalars['Boolean']['output']
  inRecommendNewest: Scalars['Boolean']['output']
  inSearch: Scalars['Boolean']['output']
  score: Scalars['Float']['output']
}

export type GQLArticleRecommendationActivity = {
  __typename?: 'ArticleRecommendationActivity'
  /** Recommended articles */
  nodes?: Maybe<Array<GQLArticle>>
  /** The source type of recommendation */
  source?: Maybe<GQLArticleRecommendationActivitySource>
}

export type GQLArticleRecommendationActivitySource =
  | 'ReadArticlesTags'
  | 'UserDonation'

/** Enums for an article state. */
export type GQLArticleState = 'active' | 'archived' | 'banned'

export type GQLArticleTranslation = {
  __typename?: 'ArticleTranslation'
  content?: Maybe<Scalars['String']['output']>
  language?: Maybe<Scalars['String']['output']>
  summary?: Maybe<Scalars['String']['output']>
  title?: Maybe<Scalars['String']['output']>
}

export type GQLArticleVersion = GQLNode & {
  __typename?: 'ArticleVersion'
  contents: GQLArticleContents
  createdAt: Scalars['DateTime']['output']
  dataHash?: Maybe<Scalars['String']['output']>
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  mediaHash?: Maybe<Scalars['String']['output']>
  summary: Scalars['String']['output']
  title: Scalars['String']['output']
  translation?: Maybe<GQLArticleTranslation>
}

export type GQLArticleVersionTranslationArgs = {
  input?: InputMaybe<GQLTranslationArgs>
}

export type GQLArticleVersionEdge = {
  __typename?: 'ArticleVersionEdge'
  cursor: Scalars['String']['output']
  node: GQLArticleVersion
}

export type GQLArticleVersionsConnection = GQLConnection & {
  __typename?: 'ArticleVersionsConnection'
  edges: Array<Maybe<GQLArticleVersionEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLArticleVersionsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
}

/** This type contains type, link and related data of an asset. */
export type GQLAsset = {
  __typename?: 'Asset'
  /** Time of this asset was created. */
  createdAt: Scalars['DateTime']['output']
  draft?: Maybe<Scalars['Boolean']['output']>
  /** Unique ID of this Asset. */
  id: Scalars['ID']['output']
  /** Link of this asset. */
  path: Scalars['String']['output']
  /** Types of this asset. */
  type: GQLAssetType
  uploadURL?: Maybe<Scalars['String']['output']>
}

/** Enums for asset types. */
export type GQLAssetType =
  | 'announcementCover'
  | 'avatar'
  | 'campaignCover'
  | 'circleAvatar'
  | 'circleCover'
  | 'collectionCover'
  | 'cover'
  | 'embed'
  | 'embedaudio'
  | 'moment'
  | 'oauthClientAvatar'
  | 'profileCover'
  | 'tagCover'

export type GQLAuthResult = {
  __typename?: 'AuthResult'
  auth: Scalars['Boolean']['output']
  token?: Maybe<Scalars['String']['output']>
  type: GQLAuthResultType
  user?: Maybe<GQLUser>
}

export type GQLAuthResultType = 'LinkAccount' | 'Login' | 'Signup'

export type GQLAuthorsType = 'active' | 'appreciated' | 'default' | 'trendy'

export type GQLBadge = {
  __typename?: 'Badge'
  type: GQLBadgeType
}

export type GQLBadgeType =
  | 'architect'
  | 'golden_motor'
  | 'nomad1'
  | 'nomad2'
  | 'nomad3'
  | 'nomad4'
  | 'seed'

export type GQLBadgedUsersInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  type?: InputMaybe<GQLBadgeType>
}

export type GQLBalance = {
  __typename?: 'Balance'
  HKD: Scalars['Float']['output']
}

export type GQLBlockchainTransaction = {
  __typename?: 'BlockchainTransaction'
  chain: GQLChain
  txHash: Scalars['String']['output']
}

export type GQLBlockedSearchKeyword = {
  __typename?: 'BlockedSearchKeyword'
  /** Time of this search keyword was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of bloked search keyword. */
  id: Scalars['ID']['output']
  /** Types of this search keyword. */
  searchKey: Scalars['String']['output']
}

export type GQLBoostTypes = 'Article' | 'Tag' | 'User'

export type GQLCacheControlScope = 'PRIVATE' | 'PUBLIC'

export type GQLCampaign = {
  description: Scalars['String']['output']
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  shortHash: Scalars['String']['output']
  state: GQLCampaignState
}

export type GQLCampaignApplicationState = 'pending' | 'rejected' | 'succeeded'

export type GQLCampaignArticlesFilter = {
  stage: Scalars['String']['input']
}

export type GQLCampaignArticlesInput = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLCampaignArticlesFilter>
  first?: InputMaybe<Scalars['Int']['input']>
}

export type GQLCampaignConnection = GQLConnection & {
  __typename?: 'CampaignConnection'
  edges?: Maybe<Array<GQLCampaignEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLCampaignEdge = {
  __typename?: 'CampaignEdge'
  cursor: Scalars['String']['output']
  node: GQLCampaign
}

export type GQLCampaignInput = {
  shortHash: Scalars['String']['input']
}

export type GQLCampaignStage = {
  __typename?: 'CampaignStage'
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  period?: Maybe<GQLDatetimeRange>
}

export type GQLCampaignStageInput = {
  name: Array<GQLTranslationInput>
  period?: InputMaybe<GQLDatetimeRangeInput>
}

export type GQLCampaignState = 'active' | 'archived' | 'finished' | 'pending'

export type GQLCampaignsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  /** return pending and archived campaigns */
  oss?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLChain = 'Optimism' | 'Polygon'

export type GQLChangeEmailInput = {
  newEmail: Scalars['String']['input']
  newEmailCodeId: Scalars['ID']['input']
  oldEmail: Scalars['String']['input']
  oldEmailCodeId: Scalars['ID']['input']
}

export type GQLCircle = GQLNode & {
  __typename?: 'Circle'
  /** Analytics dashboard. */
  analytics: GQLCircleAnalytics
  /**
   * Circle avatar's link.
   * @deprecated No longer in use
   */
  avatar?: Maybe<Scalars['String']['output']>
  /** Comments broadcasted by Circle owner. */
  broadcast: GQLCommentConnection
  /**
   * Circle cover's link.
   * @deprecated No longer in use
   */
  cover?: Maybe<Scalars['String']['output']>
  /**
   * Created time.
   * @deprecated No longer in use
   */
  createdAt: Scalars['DateTime']['output']
  /** A short description of this Circle. */
  description?: Maybe<Scalars['String']['output']>
  /** Comments made by Circle member. */
  discussion: GQLCommentConnection
  /** Discussion (include replies) count of this circle. */
  discussionCount: Scalars['Int']['output']
  /** Discussion (exclude replies) count of this circle. */
  discussionThreadCount: Scalars['Int']['output']
  /**
   * Human readable name of this Circle.
   * @deprecated No longer in use
   */
  displayName: Scalars['String']['output']
  /**
   * List of Circle follower.
   * @deprecated No longer in use
   */
  followers: GQLUserConnection
  /** Unique ID. */
  id: Scalars['ID']['output']
  /** Invitation used by current viewer. */
  invitedBy?: Maybe<GQLInvitation>
  /** Invitations belonged to this Circle. */
  invites: GQLInvites
  /**
   * This value determines if current viewer is following Circle or not.
   * @deprecated No longer in use
   */
  isFollower: Scalars['Boolean']['output']
  /**
   * This value determines if current viewer is Member or not.
   * @deprecated No longer in use
   */
  isMember: Scalars['Boolean']['output']
  /**
   * List of Circle member.
   * @deprecated No longer in use
   */
  members: GQLMemberConnection
  /**
   * Slugified name of this Circle.
   * @deprecated No longer in use
   */
  name: Scalars['String']['output']
  /** Circle owner. */
  owner: GQLUser
  /** Pinned comments broadcasted by Circle owner. */
  pinnedBroadcast?: Maybe<Array<GQLComment>>
  /** Prices offered by this Circle. */
  prices?: Maybe<Array<GQLPrice>>
  /**
   * State of this Circle.
   * @deprecated No longer in use
   */
  state: GQLCircleState
  /**
   * Updated time.
   * @deprecated No longer in use
   */
  updatedAt: Scalars['DateTime']['output']
  /**
   * List of works belong to this Circle.
   * @deprecated No longer in use
   */
  works: GQLArticleConnection
}

export type GQLCircleBroadcastArgs = {
  input: GQLCommentsInput
}

export type GQLCircleDiscussionArgs = {
  input: GQLCommentsInput
}

export type GQLCircleFollowersArgs = {
  input: GQLConnectionArgs
}

export type GQLCircleMembersArgs = {
  input: GQLConnectionArgs
}

export type GQLCircleWorksArgs = {
  input: GQLConnectionArgs
}

export type GQLCircleAnalytics = {
  __typename?: 'CircleAnalytics'
  content: GQLCircleContentAnalytics
  follower: GQLCircleFollowerAnalytics
  income: GQLCircleIncomeAnalytics
  subscriber: GQLCircleSubscriberAnalytics
}

export type GQLCircleConnection = GQLConnection & {
  __typename?: 'CircleConnection'
  edges?: Maybe<Array<GQLCircleEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLCircleContentAnalytics = {
  __typename?: 'CircleContentAnalytics'
  paywall?: Maybe<Array<GQLCircleContentAnalyticsDatum>>
  public?: Maybe<Array<GQLCircleContentAnalyticsDatum>>
}

export type GQLCircleContentAnalyticsDatum = {
  __typename?: 'CircleContentAnalyticsDatum'
  node: GQLArticle
  readCount: Scalars['Int']['output']
}

export type GQLCircleEdge = {
  __typename?: 'CircleEdge'
  cursor: Scalars['String']['output']
  node: GQLCircle
}

export type GQLCircleFollowerAnalytics = {
  __typename?: 'CircleFollowerAnalytics'
  /** current follower count */
  current: Scalars['Int']['output']
  /** the percentage of follower count in reader count of circle articles */
  followerPercentage: Scalars['Float']['output']
  /** subscriber count history of last 4 months */
  history: Array<GQLMonthlyDatum>
}

export type GQLCircleIncomeAnalytics = {
  __typename?: 'CircleIncomeAnalytics'
  /** income history of last 4 months */
  history: Array<GQLMonthlyDatum>
  /** income of next month */
  nextMonth: Scalars['Float']['output']
  /** income of this month */
  thisMonth: Scalars['Float']['output']
  /** total income of all time */
  total: Scalars['Float']['output']
}

export type GQLCircleInput = {
  /** Slugified name of a Circle. */
  name: Scalars['String']['input']
}

export type GQLCircleNotice = GQLNotice & {
  __typename?: 'CircleNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  /** Optional discussion/broadcast comments for bundled notices */
  comments?: Maybe<Array<GQLComment>>
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  /** Optional mention comments for bundled notices */
  mentions?: Maybe<Array<GQLComment>>
  /** Optional discussion/broadcast replies for bundled notices */
  replies?: Maybe<Array<GQLComment>>
  target: GQLCircle
  type: GQLCircleNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLCircleNoticeType =
  | 'CircleInvitation'
  | 'CircleNewBroadcastComments'
  | 'CircleNewDiscussionComments'
  | 'CircleNewFollower'
  | 'CircleNewSubscriber'
  | 'CircleNewUnsubscriber'

export type GQLCircleRecommendationActivity = {
  __typename?: 'CircleRecommendationActivity'
  /** Recommended circles */
  nodes?: Maybe<Array<GQLCircle>>
  /** The source type of recommendation */
  source?: Maybe<GQLCircleRecommendationActivitySource>
}

export type GQLCircleRecommendationActivitySource = 'UserSubscription'

export type GQLCircleState = 'active' | 'archived'

export type GQLCircleSubscriberAnalytics = {
  __typename?: 'CircleSubscriberAnalytics'
  /** current invitee count */
  currentInvitee: Scalars['Int']['output']
  /** current subscriber count */
  currentSubscriber: Scalars['Int']['output']
  /** invitee count history of last 4 months */
  inviteeHistory: Array<GQLMonthlyDatum>
  /** subscriber count history of last 4 months */
  subscriberHistory: Array<GQLMonthlyDatum>
}

export type GQLClaimLogbooksInput = {
  ethAddress: Scalars['String']['input']
  /** nonce from generateSigningMessage */
  nonce: Scalars['String']['input']
  /** sign'ed by wallet */
  signature: Scalars['String']['input']
  /** the message being sign'ed, including nonce */
  signedMessage: Scalars['String']['input']
}

export type GQLClaimLogbooksResult = {
  __typename?: 'ClaimLogbooksResult'
  ids?: Maybe<Array<Scalars['ID']['output']>>
  txHash: Scalars['String']['output']
}

export type GQLClearReadHistoryInput = {
  id?: InputMaybe<Scalars['ID']['input']>
}

export type GQLCollection = GQLNode &
  GQLPinnableWork & {
    __typename?: 'Collection'
    articles: GQLArticleConnection
    author: GQLUser
    /** Check if the collection contains the article */
    contains: Scalars['Boolean']['output']
    cover?: Maybe<Scalars['String']['output']>
    description?: Maybe<Scalars['String']['output']>
    id: Scalars['ID']['output']
    pinned: Scalars['Boolean']['output']
    title: Scalars['String']['output']
    updatedAt: Scalars['DateTime']['output']
  }

export type GQLCollectionArticlesArgs = {
  input: GQLCollectionArticlesInput
}

export type GQLCollectionContainsArgs = {
  input: GQLNodeInput
}

export type GQLCollectionArticlesInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  reversed?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLCollectionConnection = GQLConnection & {
  __typename?: 'CollectionConnection'
  edges?: Maybe<Array<GQLCollectionEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLCollectionEdge = {
  __typename?: 'CollectionEdge'
  cursor: Scalars['String']['output']
  node: GQLCollection
}

/** This type contains content, author, descendant comments and related data of a comment. */
export type GQLComment = GQLNode & {
  __typename?: 'Comment'
  /** Author of this comment. */
  author: GQLUser
  /** Descendant comments of this comment. */
  comments: GQLCommentConnection
  /** Content of this comment. */
  content?: Maybe<Scalars['String']['output']>
  /** Time of this comment was created. */
  createdAt: Scalars['DateTime']['output']
  /**
   * The counting number of downvotes.
   * @deprecated No longer in use in querying
   */
  downvotes: Scalars['Int']['output']
  /** This value determines this comment is from article donator or not. */
  fromDonator: Scalars['Boolean']['output']
  /** Unique ID of this comment. */
  id: Scalars['ID']['output']
  /** The value determines current user's vote. */
  myVote?: Maybe<GQLVote>
  /** Current comment belongs to which Node. */
  node: GQLNode
  /** Parent comment of this comment. */
  parentComment?: Maybe<GQLComment>
  /** This value determines this comment is pinned or not. */
  pinned: Scalars['Boolean']['output']
  remark?: Maybe<Scalars['String']['output']>
  /** A Comment that this comment replied to. */
  replyTo?: Maybe<GQLComment>
  /** State of this comment. */
  state: GQLCommentState
  type: GQLCommentType
  /** The counting number of upvotes. */
  upvotes: Scalars['Int']['output']
}

/** This type contains content, author, descendant comments and related data of a comment. */
export type GQLCommentCommentsArgs = {
  input: GQLCommentCommentsInput
}

export type GQLCommentCommentNotice = GQLNotice & {
  __typename?: 'CommentCommentNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  comment: GQLComment
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLComment
  type: GQLCommentCommentNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLCommentCommentNoticeType = 'CommentNewReply'

export type GQLCommentCommentsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  author?: InputMaybe<Scalars['ID']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  sort?: InputMaybe<GQLCommentSort>
}

export type GQLCommentConnection = GQLConnection & {
  __typename?: 'CommentConnection'
  edges?: Maybe<Array<GQLCommentEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLCommentEdge = {
  __typename?: 'CommentEdge'
  cursor: Scalars['String']['output']
  node: GQLComment
}

export type GQLCommentInput = {
  articleId?: InputMaybe<Scalars['ID']['input']>
  circleId?: InputMaybe<Scalars['ID']['input']>
  content: Scalars['String']['input']
  mentions?: InputMaybe<Array<Scalars['ID']['input']>>
  momentId?: InputMaybe<Scalars['ID']['input']>
  parentId?: InputMaybe<Scalars['ID']['input']>
  replyTo?: InputMaybe<Scalars['ID']['input']>
  type: GQLCommentType
}

export type GQLCommentNotice = GQLNotice & {
  __typename?: 'CommentNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLComment
  type: GQLCommentNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLCommentNoticeType =
  | 'ArticleNewComment'
  | 'CircleNewBroadcast'
  | 'CommentLiked'
  | 'CommentMentionedYou'
  | 'CommentPinned'
  | 'MomentNewComment'
  | 'SubscribedArticleNewComment'

/** Enums for sorting comments by time. */
export type GQLCommentSort = 'newest' | 'oldest'

/** Enums for comment state. */
export type GQLCommentState = 'active' | 'archived' | 'banned' | 'collapsed'

export type GQLCommentType =
  | 'article'
  | 'circleBroadcast'
  | 'circleDiscussion'
  | 'moment'

export type GQLCommentsFilter = {
  author?: InputMaybe<Scalars['ID']['input']>
  parentComment?: InputMaybe<Scalars['ID']['input']>
  state?: InputMaybe<GQLCommentState>
}

export type GQLCommentsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  before?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLCommentsFilter>
  first?: InputMaybe<Scalars['Int']['input']>
  includeAfter?: InputMaybe<Scalars['Boolean']['input']>
  includeBefore?: InputMaybe<Scalars['Boolean']['input']>
  sort?: InputMaybe<GQLCommentSort>
}

export type GQLConfirmVerificationCodeInput = {
  code: Scalars['String']['input']
  email: Scalars['String']['input']
  type: GQLVerificationCodeType
}

export type GQLConnectStripeAccountInput = {
  country: GQLStripeAccountCountry
}

export type GQLConnectStripeAccountResult = {
  __typename?: 'ConnectStripeAccountResult'
  redirectUrl: Scalars['String']['output']
}

export type GQLConnection = {
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLFilterInput>
  first?: InputMaybe<Scalars['Int']['input']>
  oss?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLCryptoWallet = {
  __typename?: 'CryptoWallet'
  address: Scalars['String']['output']
  /**  does this address own any Travelogger NFTs? this value is cached at most 1day, and refreshed at next `nfts` query  */
  hasNFTs: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  /** NFT assets owned by this wallet address */
  nfts?: Maybe<Array<GQLNftAsset>>
}

export type GQLCryptoWalletSignaturePurpose =
  | 'airdrop'
  | 'connect'
  | 'login'
  | 'signup'

export type GQLDatetimeRange = {
  __typename?: 'DatetimeRange'
  end?: Maybe<Scalars['DateTime']['output']>
  start: Scalars['DateTime']['output']
}

export type GQLDatetimeRangeInput = {
  end?: InputMaybe<Scalars['DateTime']['input']>
  start: Scalars['DateTime']['input']
}

export type GQLDeleteAnnouncementsInput = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type GQLDeleteArticlesTagsInput = {
  articles?: InputMaybe<Array<Scalars['ID']['input']>>
  id: Scalars['ID']['input']
}

export type GQLDeleteCollectionArticlesInput = {
  articles: Array<Scalars['ID']['input']>
  collection: Scalars['ID']['input']
}

export type GQLDeleteCollectionsInput = {
  ids: Array<Scalars['ID']['input']>
}

export type GQLDeleteCommentInput = {
  id: Scalars['ID']['input']
}

export type GQLDeleteDraftInput = {
  id: Scalars['ID']['input']
}

export type GQLDeleteMomentInput = {
  id: Scalars['ID']['input']
}

export type GQLDeleteTagsInput = {
  ids: Array<Scalars['ID']['input']>
}

export type GQLDirectImageUploadInput = {
  draft?: InputMaybe<Scalars['Boolean']['input']>
  entityId?: InputMaybe<Scalars['ID']['input']>
  entityType: GQLEntityType
  mime?: InputMaybe<Scalars['String']['input']>
  type: GQLAssetType
  url?: InputMaybe<Scalars['String']['input']>
}

/** This type contains content, collections, assets and related data of a draft. */
export type GQLDraft = GQLNode & {
  __typename?: 'Draft'
  /** Access related fields on circle */
  access: GQLDraftAccess
  /** Published article */
  article?: Maybe<GQLArticle>
  /** List of assets are belonged to this draft. */
  assets: Array<GQLAsset>
  /** whether readers can comment */
  canComment: Scalars['Boolean']['output']
  /** Collection list of this draft. */
  collection: GQLArticleConnection
  /** Content (HTML) of this draft. */
  content?: Maybe<Scalars['String']['output']>
  /** Draft's cover link. */
  cover?: Maybe<Scalars['String']['output']>
  /** Time of this draft was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this draft. */
  id: Scalars['ID']['output']
  /** whether publish to ISCN */
  iscnPublish?: Maybe<Scalars['Boolean']['output']>
  /** License Type */
  license: GQLArticleLicenseType
  /** Media hash, composed of cid encoding, of this draft. */
  mediaHash?: Maybe<Scalars['String']['output']>
  /** State of draft during publihsing. */
  publishState: GQLPublishState
  /** creator message after support */
  replyToDonator?: Maybe<Scalars['String']['output']>
  /** creator message asking for support */
  requestForDonation?: Maybe<Scalars['String']['output']>
  /** whether content is marked as sensitive by author */
  sensitiveByAuthor: Scalars['Boolean']['output']
  /** Slugified draft title. */
  slug: Scalars['String']['output']
  /** Summary of this draft. */
  summary?: Maybe<Scalars['String']['output']>
  /** This value determines if the summary is customized or not. */
  summaryCustomized: Scalars['Boolean']['output']
  /** Tags are attached to this draft. */
  tags?: Maybe<Array<Scalars['String']['output']>>
  /** Draft title. */
  title?: Maybe<Scalars['String']['output']>
  /** Last time of this draft was upadted. */
  updatedAt: Scalars['DateTime']['output']
  /** The counting number of words in this draft. */
  wordCount: Scalars['Int']['output']
}

/** This type contains content, collections, assets and related data of a draft. */
export type GQLDraftCollectionArgs = {
  input: GQLConnectionArgs
}

export type GQLDraftAccess = {
  __typename?: 'DraftAccess'
  circle?: Maybe<GQLCircle>
  type: GQLArticleAccessType
}

export type GQLDraftConnection = GQLConnection & {
  __typename?: 'DraftConnection'
  edges?: Maybe<Array<GQLDraftEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLDraftEdge = {
  __typename?: 'DraftEdge'
  cursor: Scalars['String']['output']
  node: GQLDraft
}

export type GQLEditArticleInput = {
  accessType?: InputMaybe<GQLArticleAccessType>
  /** whether readers can comment */
  canComment?: InputMaybe<Scalars['Boolean']['input']>
  circle?: InputMaybe<Scalars['ID']['input']>
  collection?: InputMaybe<Array<Scalars['ID']['input']>>
  content?: InputMaybe<Scalars['String']['input']>
  cover?: InputMaybe<Scalars['ID']['input']>
  /** revision description */
  description?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  /** whether publish to ISCN */
  iscnPublish?: InputMaybe<Scalars['Boolean']['input']>
  license?: InputMaybe<GQLArticleLicenseType>
  pinned?: InputMaybe<Scalars['Boolean']['input']>
  replyToDonator?: InputMaybe<Scalars['String']['input']>
  requestForDonation?: InputMaybe<Scalars['String']['input']>
  sensitive?: InputMaybe<Scalars['Boolean']['input']>
  state?: InputMaybe<GQLArticleState>
  /** deprecated, use pinned instead */
  sticky?: InputMaybe<Scalars['Boolean']['input']>
  summary?: InputMaybe<Scalars['String']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  title?: InputMaybe<Scalars['String']['input']>
}

export type GQLEmailLoginInput = {
  email: Scalars['String']['input']
  /** used in register */
  language?: InputMaybe<GQLUserLanguage>
  passwordOrCode: Scalars['String']['input']
  referralCode?: InputMaybe<Scalars['String']['input']>
}

export type GQLEntityType =
  | 'announcement'
  | 'article'
  | 'circle'
  | 'collection'
  | 'draft'
  | 'moment'
  | 'tag'
  | 'user'

export type GQLExchangeRate = {
  __typename?: 'ExchangeRate'
  from: GQLTransactionCurrency
  rate: Scalars['Float']['output']
  to: GQLQuoteCurrency
  /** Last updated time from currency convertor APIs */
  updatedAt: Scalars['DateTime']['output']
}

export type GQLExchangeRatesInput = {
  from?: InputMaybe<GQLTransactionCurrency>
  to?: InputMaybe<GQLQuoteCurrency>
}

export type GQLFeature = {
  __typename?: 'Feature'
  enabled: Scalars['Boolean']['output']
  name: GQLFeatureName
}

export type GQLFeatureFlag = 'admin' | 'off' | 'on' | 'seeding'

export type GQLFeatureName =
  | 'add_credit'
  | 'circle_interact'
  | 'circle_management'
  | 'fingerprint'
  | 'payment'
  | 'payout'
  | 'tag_adoption'
  | 'verify_appreciate'

export type GQLFeaturedCommentsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  sort?: InputMaybe<GQLCommentSort>
}

export type GQLFeaturedTagsInput = {
  /**  tagIds  */
  ids: Array<Scalars['ID']['input']>
}

export type GQLFilterInput = {
  /** Used in RecommendInput */
  followed?: InputMaybe<Scalars['Boolean']['input']>
  inRangeEnd?: InputMaybe<Scalars['DateTime']['input']>
  inRangeStart?: InputMaybe<Scalars['DateTime']['input']>
  /** index of list, min: 0, max: 49 */
  random?: InputMaybe<Scalars['Int']['input']>
  /** Used in User Articles filter, by tags or by time range, or both */
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type GQLFollowing = {
  __typename?: 'Following'
  circles: GQLCircleConnection
  tags: GQLTagConnection
  users: GQLUserConnection
}

export type GQLFollowingCirclesArgs = {
  input: GQLConnectionArgs
}

export type GQLFollowingTagsArgs = {
  input: GQLConnectionArgs
}

export type GQLFollowingUsersArgs = {
  input: GQLConnectionArgs
}

export type GQLFollowingActivity =
  | GQLArticleRecommendationActivity
  | GQLCircleRecommendationActivity
  | GQLUserAddArticleTagActivity
  | GQLUserBroadcastCircleActivity
  | GQLUserCreateCircleActivity
  | GQLUserPostMomentActivity
  | GQLUserPublishArticleActivity
  | GQLUserRecommendationActivity

export type GQLFollowingActivityConnection = GQLConnection & {
  __typename?: 'FollowingActivityConnection'
  edges?: Maybe<Array<GQLFollowingActivityEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLFollowingActivityEdge = {
  __typename?: 'FollowingActivityEdge'
  cursor: Scalars['String']['output']
  node: GQLFollowingActivity
}

export type GQLFrequentSearchInput = {
  first?: InputMaybe<Scalars['Int']['input']>
  key?: InputMaybe<Scalars['String']['input']>
}

export type GQLGenerateSigningMessageInput = {
  address: Scalars['String']['input']
  purpose?: InputMaybe<GQLSigningMessagePurpose>
}

export type GQLGrantType = 'authorization_code' | 'refresh_token'

export type GQLIcymiTopic = GQLNode & {
  __typename?: 'IcymiTopic'
  archivedAt?: Maybe<Scalars['DateTime']['output']>
  articles: Array<GQLArticle>
  id: Scalars['ID']['output']
  note?: Maybe<Scalars['String']['output']>
  pinAmount: Scalars['Int']['output']
  publishedAt?: Maybe<Scalars['DateTime']['output']>
  state: GQLIcymiTopicState
  title: Scalars['String']['output']
}

export type GQLIcymiTopicConnection = GQLConnection & {
  __typename?: 'IcymiTopicConnection'
  edges: Array<GQLIcymiTopicEdge>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLIcymiTopicEdge = {
  __typename?: 'IcymiTopicEdge'
  cursor: Scalars['String']['output']
  node: GQLIcymiTopic
}

export type GQLIcymiTopicState = 'archived' | 'editing' | 'published'

export type GQLInvitation = {
  __typename?: 'Invitation'
  /** Accepted time. */
  acceptedAt?: Maybe<Scalars['DateTime']['output']>
  /** Invitation of current Circle. */
  circle: GQLCircle
  /** Created time. */
  createdAt: Scalars['DateTime']['output']
  /** Free period of this invitation. */
  freePeriod: Scalars['Int']['output']
  /** Unique ID. */
  id: Scalars['ID']['output']
  /** Target person of this invitation. */
  invitee: GQLInvitee
  /** Creator of this invitation. */
  inviter: GQLUser
  /** Sent time. */
  sentAt: Scalars['DateTime']['output']
  /** Determine it's specific state. */
  state: GQLInvitationState
}

export type GQLInvitationConnection = GQLConnection & {
  __typename?: 'InvitationConnection'
  edges?: Maybe<Array<GQLInvitationEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLInvitationEdge = {
  __typename?: 'InvitationEdge'
  cursor: Scalars['String']['output']
  node: GQLInvitation
}

export type GQLInvitationState =
  | 'accepted'
  | 'pending'
  | 'transfer_failed'
  | 'transfer_succeeded'

export type GQLInviteCircleInput = {
  circleId: Scalars['ID']['input']
  freePeriod: Scalars['Int']['input']
  invitees: Array<GQLInviteCircleInvitee>
}

export type GQLInviteCircleInvitee = {
  email?: InputMaybe<Scalars['String']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
}

export type GQLInvitee = GQLPerson | GQLUser

export type GQLInvites = {
  __typename?: 'Invites'
  /** Accepted invitation list */
  accepted: GQLInvitationConnection
  /** Pending invitation list */
  pending: GQLInvitationConnection
}

export type GQLInvitesAcceptedArgs = {
  input: GQLConnectionArgs
}

export type GQLInvitesPendingArgs = {
  input: GQLConnectionArgs
}

export type GQLKeywordInput = {
  keyword: Scalars['String']['input']
}

export type GQLKeywordsInput = {
  keywords?: InputMaybe<Array<Scalars['String']['input']>>
}

export type GQLLikeMomentInput = {
  id: Scalars['ID']['input']
}

export type GQLLiker = {
  __typename?: 'Liker'
  /** Whether liker is a civic liker */
  civicLiker: Scalars['Boolean']['output']
  /** Liker ID of LikeCoin */
  likerId?: Maybe<Scalars['String']['output']>
  /**
   * Rate of LikeCoin/USD
   * @deprecated No longer in use
   */
  rateUSD?: Maybe<Scalars['Float']['output']>
  /** Total LIKE left in wallet. */
  total: Scalars['Float']['output']
}

export type GQLLogRecordInput = {
  type: GQLLogRecordTypes
}

export type GQLLogRecordTypes =
  | 'ReadFolloweeArticles'
  | 'ReadFollowingFeed'
  | 'ReadResponseInfoPopUp'

export type GQLMember = {
  __typename?: 'Member'
  /** Price chosen by user when joining a Circle. */
  price: GQLPrice
  /** User who join to a Circle. */
  user: GQLUser
}

export type GQLMemberConnection = GQLConnection & {
  __typename?: 'MemberConnection'
  edges?: Maybe<Array<GQLMemberEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLMemberEdge = {
  __typename?: 'MemberEdge'
  cursor: Scalars['String']['output']
  node: GQLMember
}

export type GQLMergeTagsInput = {
  content: Scalars['String']['input']
  ids: Array<Scalars['ID']['input']>
}

export type GQLMigrationInput = {
  files: Array<InputMaybe<Scalars['Upload']['input']>>
  type?: InputMaybe<GQLMigrationType>
}

export type GQLMigrationType = 'medium'

export type GQLMoment = GQLNode & {
  __typename?: 'Moment'
  assets: Array<GQLAsset>
  author: GQLUser
  commentCount: Scalars['Int']['output']
  commentedFollowees: Array<GQLUser>
  comments: GQLCommentConnection
  content?: Maybe<Scalars['String']['output']>
  createdAt: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  likeCount: Scalars['Int']['output']
  /** whether current user has liked it */
  liked: Scalars['Boolean']['output']
  shortHash: Scalars['String']['output']
  state: GQLMomentState
}

export type GQLMomentCommentsArgs = {
  input: GQLCommentsInput
}

export type GQLMomentInput = {
  shortHash: Scalars['String']['input']
}

export type GQLMomentNotice = GQLNotice & {
  __typename?: 'MomentNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLMoment
  type: GQLMomentNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLMomentNoticeType = 'MomentLiked' | 'MomentMentionedYou'

export type GQLMomentState = 'active' | 'archived'

export type GQLMonthlyDatum = {
  __typename?: 'MonthlyDatum'
  date: Scalars['DateTime']['output']
  value: Scalars['Float']['output']
}

export type GQLMutation = {
  __typename?: 'Mutation'
  /** Add one tag to articles. */
  addArticlesTags: GQLTag
  /** Add blocked search keyword to blocked_search_word db */
  addBlockedSearchKeyword: GQLBlockedSearchKeyword
  /** Add articles to the begining of the collections. */
  addCollectionsArticles: Array<GQLCollection>
  /** Add Credit to User Wallet */
  addCredit: GQLAddCreditResult
  /** Add a social login to current user. */
  addSocialLogin: GQLUser
  /** Add a wallet login to current user. */
  addWalletLogin: GQLUser
  applyCampaign: GQLCampaign
  /** Appreciate an article. */
  appreciateArticle: GQLArticle
  /**
   * Change user email.
   * @deprecated use 'setEmail' instead
   */
  changeEmail: GQLUser
  /** Let Traveloggers owner claims a Logbook, returns transaction hash */
  claimLogbooks: GQLClaimLogbooksResult
  /** Clear read history for user. */
  clearReadHistory: GQLUser
  /** Clear search history for user. */
  clearSearchHistory?: Maybe<Scalars['Boolean']['output']>
  /** Confirm verification code from email. */
  confirmVerificationCode: Scalars['ID']['output']
  /** Create Stripe Connect account for Payout */
  connectStripeAccount: GQLConnectStripeAccountResult
  deleteAnnouncements: Scalars['Boolean']['output']
  /** Delete one tag from articles */
  deleteArticlesTags: GQLTag
  /** Delete blocked search keywords from search_history db */
  deleteBlockedSearchKeywords?: Maybe<Scalars['Boolean']['output']>
  /** Remove articles from the collection. */
  deleteCollectionArticles: GQLCollection
  deleteCollections: Scalars['Boolean']['output']
  /** Remove a comment. */
  deleteComment: GQLComment
  /** Remove a draft. */
  deleteDraft?: Maybe<Scalars['Boolean']['output']>
  deleteMoment: GQLMoment
  deleteTags?: Maybe<Scalars['Boolean']['output']>
  directImageUpload: GQLAsset
  /** Edit an article. */
  editArticle: GQLArticle
  emailLogin: GQLAuthResult
  /**
   * Generate or claim a Liker ID through LikeCoin
   * @deprecated No longer in use
   */
  generateLikerId: GQLUser
  /** Get signing message. */
  generateSigningMessage: GQLSigningMessageResult
  /** Invite others to join circle */
  invite?: Maybe<Array<GQLInvitation>>
  likeMoment: GQLMoment
  /** Add specific user behavior record. */
  logRecord?: Maybe<Scalars['Boolean']['output']>
  /** Mark all received notices as read. */
  markAllNoticesAsRead?: Maybe<Scalars['Boolean']['output']>
  mergeTags: GQLTag
  /** Migrate articles from other service provider. */
  migration?: Maybe<Scalars['Boolean']['output']>
  /** Pay to another user or article */
  payTo: GQLPayToResult
  /** Payout to user */
  payout: GQLTransaction
  /** Pin a comment. */
  pinComment: GQLComment
  /** Publish an article onto IPFS. */
  publishArticle: GQLDraft
  putAnnouncement: GQLAnnouncement
  /** Create or update a Circle. */
  putCircle: GQLCircle
  /**
   * Add or remove Circle's articles
   * @deprecated No longer in use
   */
  putCircleArticles: GQLCircle
  putCollection: GQLCollection
  /** Publish or update a comment. */
  putComment: GQLComment
  /** Create or update a draft. */
  putDraft: GQLDraft
  /** update tags for showing on profile page */
  putFeaturedTags?: Maybe<Array<GQLTag>>
  putIcymiTopic?: Maybe<GQLIcymiTopic>
  putMoment: GQLMoment
  /** Create or Update an OAuth Client, used in OSS. */
  putOAuthClient?: Maybe<GQLOAuthClient>
  putRemark?: Maybe<Scalars['String']['output']>
  putRestrictedUsers: Array<GQLUser>
  putSkippedListItem?: Maybe<Array<GQLSkippedListItem>>
  /** Create or update tag. */
  putTag: GQLTag
  putWritingChallenge: GQLWritingChallenge
  /** Read an article. */
  readArticle: GQLArticle
  /** Update state of a user, used in OSS. */
  refreshIPNSFeed: GQLUser
  /** Remove a social login from current user. */
  removeSocialLogin: GQLUser
  /** Remove a wallet login from current user. */
  removeWalletLogin: GQLUser
  renameTag: GQLTag
  /** Reorder articles in the collection. */
  reorderCollectionArticles: GQLCollection
  /** Reset Liker ID */
  resetLikerId: GQLUser
  /** Reset user or payment password. */
  resetPassword?: Maybe<Scalars['Boolean']['output']>
  /**
   * Reset crypto wallet.
   * @deprecated use 'removeWalletLogin' instead
   */
  resetWallet: GQLUser
  /** Send verification code for email. */
  sendVerificationCode?: Maybe<Scalars['Boolean']['output']>
  setBoost: GQLNode
  /** Set user currency preference. */
  setCurrency: GQLUser
  /** Set user email. */
  setEmail: GQLUser
  setFeature: GQLFeature
  /** Set user email login password. */
  setPassword: GQLUser
  /** Set user name. */
  setUserName: GQLUser
  /** Upload a single file. */
  singleFileUpload: GQLAsset
  /** Login/Signup via social accounts. */
  socialLogin: GQLAuthResult
  /** Submit inappropriate content report */
  submitReport: GQLReport
  /** Subscribe a Circle. */
  subscribeCircle: GQLSubscribeCircleResult
  toggleArticleRecommend: GQLArticle
  /** Block or Unblock a given user. */
  toggleBlockUser: GQLUser
  /**
   * Follow or unfollow a Circle.
   * @deprecated No longer in use
   */
  toggleFollowCircle: GQLCircle
  /** Follow or unfollow tag. */
  toggleFollowTag: GQLTag
  /** Follow or Unfollow current user. */
  toggleFollowUser: GQLUser
  /** Pin or Unpin a comment. */
  togglePinComment: GQLComment
  toggleSeedingUsers: Array<Maybe<GQLUser>>
  /** Subscribe or Unsubscribe article */
  toggleSubscribeArticle: GQLArticle
  toggleTagRecommend: GQLTag
  toggleUsersBadge: Array<Maybe<GQLUser>>
  unbindLikerId: GQLUser
  unlikeMoment: GQLMoment
  /** Unpin a comment. */
  unpinComment: GQLComment
  /** Unsubscribe a Circle. */
  unsubscribeCircle: GQLCircle
  /** Unvote a comment. */
  unvoteComment: GQLComment
  updateArticleSensitive: GQLArticle
  updateArticleState: GQLArticle
  /** Update articles' tag. */
  updateArticlesTags: GQLTag
  updateCampaignApplicationState: GQLCampaign
  /** Update a comments' state. */
  updateCommentsState: Array<GQLComment>
  /** Update user notification settings. */
  updateNotificationSetting: GQLUser
  /** Update member, permission and othters of a tag. */
  updateTagSetting: GQLTag
  /** Update referralCode of a user, used in OSS. */
  updateUserExtra: GQLUser
  /** Update user information. */
  updateUserInfo: GQLUser
  /** Update state of a user, used in OSS. */
  updateUserRole: GQLUser
  /** Update state of a user, used in OSS. */
  updateUserState?: Maybe<Array<GQLUser>>
  /**
   * Login user.
   * @deprecated use 'emailLogin' instead
   */
  userLogin: GQLAuthResult
  /** Logout user. */
  userLogout: Scalars['Boolean']['output']
  /**
   * Register user, can only be used on matters.{town,news} website.
   * @deprecated use 'emailLogin' instead
   */
  userRegister: GQLAuthResult
  /** Verify user email. */
  verifyEmail: GQLAuthResult
  /** Upvote or downvote a comment. */
  voteComment: GQLComment
  /** Login/Signup via a wallet. */
  walletLogin: GQLAuthResult
}

export type GQLMutationAddArticlesTagsArgs = {
  input: GQLAddArticlesTagsInput
}

export type GQLMutationAddBlockedSearchKeywordArgs = {
  input: GQLKeywordInput
}

export type GQLMutationAddCollectionsArticlesArgs = {
  input: GQLAddCollectionsArticlesInput
}

export type GQLMutationAddCreditArgs = {
  input: GQLAddCreditInput
}

export type GQLMutationAddSocialLoginArgs = {
  input: GQLSocialLoginInput
}

export type GQLMutationAddWalletLoginArgs = {
  input: GQLWalletLoginInput
}

export type GQLMutationApplyCampaignArgs = {
  input: GQLApplyCampaignInput
}

export type GQLMutationAppreciateArticleArgs = {
  input: GQLAppreciateArticleInput
}

export type GQLMutationChangeEmailArgs = {
  input: GQLChangeEmailInput
}

export type GQLMutationClaimLogbooksArgs = {
  input: GQLClaimLogbooksInput
}

export type GQLMutationClearReadHistoryArgs = {
  input: GQLClearReadHistoryInput
}

export type GQLMutationConfirmVerificationCodeArgs = {
  input: GQLConfirmVerificationCodeInput
}

export type GQLMutationConnectStripeAccountArgs = {
  input: GQLConnectStripeAccountInput
}

export type GQLMutationDeleteAnnouncementsArgs = {
  input: GQLDeleteAnnouncementsInput
}

export type GQLMutationDeleteArticlesTagsArgs = {
  input: GQLDeleteArticlesTagsInput
}

export type GQLMutationDeleteBlockedSearchKeywordsArgs = {
  input: GQLKeywordsInput
}

export type GQLMutationDeleteCollectionArticlesArgs = {
  input: GQLDeleteCollectionArticlesInput
}

export type GQLMutationDeleteCollectionsArgs = {
  input: GQLDeleteCollectionsInput
}

export type GQLMutationDeleteCommentArgs = {
  input: GQLDeleteCommentInput
}

export type GQLMutationDeleteDraftArgs = {
  input: GQLDeleteDraftInput
}

export type GQLMutationDeleteMomentArgs = {
  input: GQLDeleteMomentInput
}

export type GQLMutationDeleteTagsArgs = {
  input: GQLDeleteTagsInput
}

export type GQLMutationDirectImageUploadArgs = {
  input: GQLDirectImageUploadInput
}

export type GQLMutationEditArticleArgs = {
  input: GQLEditArticleInput
}

export type GQLMutationEmailLoginArgs = {
  input: GQLEmailLoginInput
}

export type GQLMutationGenerateSigningMessageArgs = {
  input: GQLGenerateSigningMessageInput
}

export type GQLMutationInviteArgs = {
  input: GQLInviteCircleInput
}

export type GQLMutationLikeMomentArgs = {
  input: GQLLikeMomentInput
}

export type GQLMutationLogRecordArgs = {
  input: GQLLogRecordInput
}

export type GQLMutationMergeTagsArgs = {
  input: GQLMergeTagsInput
}

export type GQLMutationMigrationArgs = {
  input: GQLMigrationInput
}

export type GQLMutationPayToArgs = {
  input: GQLPayToInput
}

export type GQLMutationPayoutArgs = {
  input: GQLPayoutInput
}

export type GQLMutationPinCommentArgs = {
  input: GQLPinCommentInput
}

export type GQLMutationPublishArticleArgs = {
  input: GQLPublishArticleInput
}

export type GQLMutationPutAnnouncementArgs = {
  input: GQLPutAnnouncementInput
}

export type GQLMutationPutCircleArgs = {
  input: GQLPutCircleInput
}

export type GQLMutationPutCircleArticlesArgs = {
  input: GQLPutCircleArticlesInput
}

export type GQLMutationPutCollectionArgs = {
  input: GQLPutCollectionInput
}

export type GQLMutationPutCommentArgs = {
  input: GQLPutCommentInput
}

export type GQLMutationPutDraftArgs = {
  input: GQLPutDraftInput
}

export type GQLMutationPutFeaturedTagsArgs = {
  input: GQLFeaturedTagsInput
}

export type GQLMutationPutIcymiTopicArgs = {
  input: GQLPutIcymiTopicInput
}

export type GQLMutationPutMomentArgs = {
  input: GQLPutMomentInput
}

export type GQLMutationPutOAuthClientArgs = {
  input: GQLPutOAuthClientInput
}

export type GQLMutationPutRemarkArgs = {
  input: GQLPutRemarkInput
}

export type GQLMutationPutRestrictedUsersArgs = {
  input: GQLPutRestrictedUsersInput
}

export type GQLMutationPutSkippedListItemArgs = {
  input: GQLPutSkippedListItemInput
}

export type GQLMutationPutTagArgs = {
  input: GQLPutTagInput
}

export type GQLMutationPutWritingChallengeArgs = {
  input: GQLPutWritingChallengeInput
}

export type GQLMutationReadArticleArgs = {
  input: GQLReadArticleInput
}

export type GQLMutationRefreshIpnsFeedArgs = {
  input: GQLRefreshIpnsFeedInput
}

export type GQLMutationRemoveSocialLoginArgs = {
  input: GQLRemoveSocialLoginInput
}

export type GQLMutationRenameTagArgs = {
  input: GQLRenameTagInput
}

export type GQLMutationReorderCollectionArticlesArgs = {
  input: GQLReorderCollectionArticlesInput
}

export type GQLMutationResetLikerIdArgs = {
  input: GQLResetLikerIdInput
}

export type GQLMutationResetPasswordArgs = {
  input: GQLResetPasswordInput
}

export type GQLMutationResetWalletArgs = {
  input: GQLResetWalletInput
}

export type GQLMutationSendVerificationCodeArgs = {
  input: GQLSendVerificationCodeInput
}

export type GQLMutationSetBoostArgs = {
  input: GQLSetBoostInput
}

export type GQLMutationSetCurrencyArgs = {
  input: GQLSetCurrencyInput
}

export type GQLMutationSetEmailArgs = {
  input: GQLSetEmailInput
}

export type GQLMutationSetFeatureArgs = {
  input: GQLSetFeatureInput
}

export type GQLMutationSetPasswordArgs = {
  input: GQLSetPasswordInput
}

export type GQLMutationSetUserNameArgs = {
  input: GQLSetUserNameInput
}

export type GQLMutationSingleFileUploadArgs = {
  input: GQLSingleFileUploadInput
}

export type GQLMutationSocialLoginArgs = {
  input: GQLSocialLoginInput
}

export type GQLMutationSubmitReportArgs = {
  input: GQLSubmitReportInput
}

export type GQLMutationSubscribeCircleArgs = {
  input: GQLSubscribeCircleInput
}

export type GQLMutationToggleArticleRecommendArgs = {
  input: GQLToggleRecommendInput
}

export type GQLMutationToggleBlockUserArgs = {
  input: GQLToggleItemInput
}

export type GQLMutationToggleFollowCircleArgs = {
  input: GQLToggleItemInput
}

export type GQLMutationToggleFollowTagArgs = {
  input: GQLToggleItemInput
}

export type GQLMutationToggleFollowUserArgs = {
  input: GQLToggleItemInput
}

export type GQLMutationTogglePinCommentArgs = {
  input: GQLToggleItemInput
}

export type GQLMutationToggleSeedingUsersArgs = {
  input: GQLToggleSeedingUsersInput
}

export type GQLMutationToggleSubscribeArticleArgs = {
  input: GQLToggleItemInput
}

export type GQLMutationToggleTagRecommendArgs = {
  input: GQLToggleRecommendInput
}

export type GQLMutationToggleUsersBadgeArgs = {
  input: GQLToggleUsersBadgeInput
}

export type GQLMutationUnbindLikerIdArgs = {
  input: GQLUnbindLikerIdInput
}

export type GQLMutationUnlikeMomentArgs = {
  input: GQLUnlikeMomentInput
}

export type GQLMutationUnpinCommentArgs = {
  input: GQLUnpinCommentInput
}

export type GQLMutationUnsubscribeCircleArgs = {
  input: GQLUnsubscribeCircleInput
}

export type GQLMutationUnvoteCommentArgs = {
  input: GQLUnvoteCommentInput
}

export type GQLMutationUpdateArticleSensitiveArgs = {
  input: GQLUpdateArticleSensitiveInput
}

export type GQLMutationUpdateArticleStateArgs = {
  input: GQLUpdateArticleStateInput
}

export type GQLMutationUpdateArticlesTagsArgs = {
  input: GQLUpdateArticlesTagsInput
}

export type GQLMutationUpdateCampaignApplicationStateArgs = {
  input: GQLUpdateCampaignApplicationStateInput
}

export type GQLMutationUpdateCommentsStateArgs = {
  input: GQLUpdateCommentsStateInput
}

export type GQLMutationUpdateNotificationSettingArgs = {
  input: GQLUpdateNotificationSettingInput
}

export type GQLMutationUpdateTagSettingArgs = {
  input: GQLUpdateTagSettingInput
}

export type GQLMutationUpdateUserExtraArgs = {
  input: GQLUpdateUserExtraInput
}

export type GQLMutationUpdateUserInfoArgs = {
  input: GQLUpdateUserInfoInput
}

export type GQLMutationUpdateUserRoleArgs = {
  input: GQLUpdateUserRoleInput
}

export type GQLMutationUpdateUserStateArgs = {
  input: GQLUpdateUserStateInput
}

export type GQLMutationUserLoginArgs = {
  input: GQLUserLoginInput
}

export type GQLMutationUserRegisterArgs = {
  input: GQLUserRegisterInput
}

export type GQLMutationVerifyEmailArgs = {
  input: GQLVerifyEmailInput
}

export type GQLMutationVoteCommentArgs = {
  input: GQLVoteCommentInput
}

export type GQLMutationWalletLoginArgs = {
  input: GQLWalletLoginInput
}

/**  NFT Asset  */
export type GQLNftAsset = {
  __typename?: 'NFTAsset'
  collectionName: Scalars['String']['output']
  /** imageOriginalUrl: String! */
  contractAddress: Scalars['String']['output']
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  imagePreviewUrl?: Maybe<Scalars['String']['output']>
  imageUrl: Scalars['String']['output']
  name: Scalars['String']['output']
}

export type GQLNode = {
  id: Scalars['ID']['output']
}

export type GQLNodeInput = {
  id: Scalars['ID']['input']
}

export type GQLNodesInput = {
  ids: Array<Scalars['ID']['input']>
}

/** This interface contains common fields of a notice. */
export type GQLNotice = {
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLNoticeConnection = GQLConnection & {
  __typename?: 'NoticeConnection'
  edges?: Maybe<Array<GQLNoticeEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLNoticeEdge = {
  __typename?: 'NoticeEdge'
  cursor: Scalars['String']['output']
  node: GQLNotice
}

export type GQLNotificationSetting = {
  __typename?: 'NotificationSetting'
  articleNewAppreciation: Scalars['Boolean']['output']
  articleNewCollected: Scalars['Boolean']['output']
  articleNewComment: Scalars['Boolean']['output']
  articleNewSubscription: Scalars['Boolean']['output']
  circleMemberNewBroadcastReply: Scalars['Boolean']['output']
  circleMemberNewDiscussion: Scalars['Boolean']['output']
  circleMemberNewDiscussionReply: Scalars['Boolean']['output']
  circleNewFollower: Scalars['Boolean']['output']
  /** for circle owners */
  circleNewSubscriber: Scalars['Boolean']['output']
  circleNewUnsubscriber: Scalars['Boolean']['output']
  email: Scalars['Boolean']['output']
  /** for circle members & followers */
  inCircleNewArticle: Scalars['Boolean']['output']
  inCircleNewBroadcast: Scalars['Boolean']['output']
  inCircleNewBroadcastReply: Scalars['Boolean']['output']
  inCircleNewDiscussion: Scalars['Boolean']['output']
  inCircleNewDiscussionReply: Scalars['Boolean']['output']
  mention: Scalars['Boolean']['output']
  newComment: Scalars['Boolean']['output']
  newLike: Scalars['Boolean']['output']
  userNewFollower: Scalars['Boolean']['output']
}

export type GQLNotificationSettingType =
  | 'articleNewAppreciation'
  | 'articleNewCollected'
  | 'articleNewComment'
  | 'articleNewSubscription'
  | 'circleMemberBroadcast'
  | 'circleMemberNewBroadcastReply'
  | 'circleMemberNewDiscussion'
  | 'circleMemberNewDiscussionReply'
  | 'circleNewDiscussion'
  | 'circleNewFollower'
  /** for circle owners */
  | 'circleNewSubscriber'
  | 'circleNewUnsubscriber'
  | 'email'
  /** for circle members */
  | 'inCircleNewArticle'
  | 'inCircleNewBroadcast'
  | 'inCircleNewBroadcastReply'
  | 'inCircleNewDiscussion'
  | 'inCircleNewDiscussionReply'
  | 'mention'
  | 'newComment'
  | 'newLike'
  | 'userNewFollower'

export type GQLOAuthClient = {
  __typename?: 'OAuthClient'
  /** URL for oauth client's avatar. */
  avatar?: Maybe<Scalars['String']['output']>
  /** Creation Date */
  createdAt: Scalars['DateTime']['output']
  /** App Description */
  description?: Maybe<Scalars['String']['output']>
  /** Grant Types */
  grantTypes?: Maybe<Array<GQLGrantType>>
  /** Unique Client ID of this OAuth Client. */
  id: Scalars['ID']['output']
  /** App name */
  name: Scalars['String']['output']
  /** Redirect URIs */
  redirectURIs?: Maybe<Array<Scalars['String']['output']>>
  /** Scopes */
  scope?: Maybe<Array<Scalars['String']['output']>>
  /** Client secret */
  secret: Scalars['String']['output']
  /** Linked Developer Account */
  user?: Maybe<GQLUser>
  /** URL for oauth client's official website */
  website?: Maybe<Scalars['String']['output']>
}

export type GQLOAuthClientConnection = GQLConnection & {
  __typename?: 'OAuthClientConnection'
  edges?: Maybe<Array<GQLOAuthClientEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLOAuthClientEdge = {
  __typename?: 'OAuthClientEdge'
  cursor: Scalars['String']['output']
  node: GQLOAuthClient
}

export type GQLOAuthClientInput = {
  id: Scalars['ID']['input']
}

export type GQLOss = {
  __typename?: 'OSS'
  articles: GQLArticleConnection
  badgedUsers: GQLUserConnection
  comments: GQLCommentConnection
  icymiTopics: GQLIcymiTopicConnection
  oauthClients: GQLOAuthClientConnection
  reports: GQLReportConnection
  restrictedUsers: GQLUserConnection
  seedingUsers: GQLUserConnection
  skippedListItems: GQLSkippedListItemsConnection
  tags: GQLTagConnection
  users: GQLUserConnection
}

export type GQLOssArticlesArgs = {
  input: GQLConnectionArgs
}

export type GQLOssBadgedUsersArgs = {
  input: GQLBadgedUsersInput
}

export type GQLOssCommentsArgs = {
  input: GQLConnectionArgs
}

export type GQLOssIcymiTopicsArgs = {
  input: GQLConnectionArgs
}

export type GQLOssOauthClientsArgs = {
  input: GQLConnectionArgs
}

export type GQLOssReportsArgs = {
  input: GQLConnectionArgs
}

export type GQLOssRestrictedUsersArgs = {
  input: GQLConnectionArgs
}

export type GQLOssSeedingUsersArgs = {
  input: GQLConnectionArgs
}

export type GQLOssSkippedListItemsArgs = {
  input: GQLSkippedListItemsInput
}

export type GQLOssTagsArgs = {
  input: GQLTagsInput
}

export type GQLOssUsersArgs = {
  input: GQLConnectionArgs
}

export type GQLOauth1CredentialInput = {
  oauthToken: Scalars['String']['input']
  oauthVerifier: Scalars['String']['input']
}

/** This type contains system-wise info and settings. */
export type GQLOfficial = {
  __typename?: 'Official'
  /** Announcements */
  announcements?: Maybe<Array<GQLAnnouncement>>
  /** Feature flag */
  features: Array<GQLFeature>
}

/** This type contains system-wise info and settings. */
export type GQLOfficialAnnouncementsArgs = {
  input: GQLAnnouncementsInput
}

/** The notice type contains info about official announcement. */
export type GQLOfficialAnnouncementNotice = GQLNotice & {
  __typename?: 'OfficialAnnouncementNotice'
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  /** The link to a specific page if provided. */
  link?: Maybe<Scalars['String']['output']>
  /** The message content. */
  message: Scalars['String']['output']
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLPageInfo = {
  __typename?: 'PageInfo'
  endCursor?: Maybe<Scalars['String']['output']>
  hasNextPage: Scalars['Boolean']['output']
  hasPreviousPage: Scalars['Boolean']['output']
  startCursor?: Maybe<Scalars['String']['output']>
}

export type GQLPayToInput = {
  amount: Scalars['Float']['input']
  /** for ERC20/native token payment */
  chain?: InputMaybe<GQLChain>
  currency: GQLTransactionCurrency
  /** for HKD payment */
  password?: InputMaybe<Scalars['String']['input']>
  purpose: GQLTransactionPurpose
  recipientId: Scalars['ID']['input']
  targetId?: InputMaybe<Scalars['ID']['input']>
  txHash?: InputMaybe<Scalars['String']['input']>
}

export type GQLPayToResult = {
  __typename?: 'PayToResult'
  /** Only available when paying with LIKE. */
  redirectUrl?: Maybe<Scalars['String']['output']>
  transaction: GQLTransaction
}

export type GQLPayoutInput = {
  amount: Scalars['Float']['input']
  password: Scalars['String']['input']
}

export type GQLPerson = {
  __typename?: 'Person'
  email: Scalars['String']['output']
}

export type GQLPinCommentInput = {
  id: Scalars['ID']['input']
}

export type GQLPinnableWork = {
  cover?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  pinned: Scalars['Boolean']['output']
  title: Scalars['String']['output']
}

export type GQLPrice = {
  __typename?: 'Price'
  /** Amount of Price. */
  amount: Scalars['Float']['output']
  /** Current Price belongs to whcih Circle. */
  circle: GQLCircle
  /**
   * Created time.
   * @deprecated No longer in use
   */
  createdAt: Scalars['DateTime']['output']
  /** Currency of Price. */
  currency: GQLTransactionCurrency
  /** Unique ID. */
  id: Scalars['ID']['output']
  /** State of Price. */
  state: GQLPriceState
  /**
   * Updated time.
   * @deprecated No longer in use
   */
  updatedAt: Scalars['DateTime']['output']
}

export type GQLPriceState = 'active' | 'archived'

export type GQLPublishArticleInput = {
  id: Scalars['ID']['input']
  /** whether publish to ISCN */
  iscnPublish?: InputMaybe<Scalars['Boolean']['input']>
}

/** Enums for publishing state. */
export type GQLPublishState = 'error' | 'pending' | 'published' | 'unpublished'

export type GQLPutAnnouncementInput = {
  content?: InputMaybe<Scalars['String']['input']>
  cover?: InputMaybe<Scalars['String']['input']>
  expiredAt?: InputMaybe<Scalars['DateTime']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
  link?: InputMaybe<Scalars['String']['input']>
  order?: InputMaybe<Scalars['Int']['input']>
  title?: InputMaybe<Scalars['String']['input']>
  translations?: InputMaybe<Array<GQLTranslatedAnnouncementInput>>
  type?: InputMaybe<GQLAnnouncementType>
  visible?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLPutCircleArticlesInput = {
  /** Access Type, `public` or `paywall` only. */
  accessType: GQLArticleAccessType
  /** Article Ids */
  articles?: InputMaybe<Array<Scalars['ID']['input']>>
  /** Circle ID */
  id: Scalars['ID']['input']
  license?: InputMaybe<GQLArticleLicenseType>
  /** Action Type */
  type: GQLPutCircleArticlesType
}

export type GQLPutCircleArticlesType = 'add' | 'remove'

export type GQLPutCircleInput = {
  /** Circle's subscription fee. */
  amount?: InputMaybe<Scalars['Float']['input']>
  /** Unique ID of a Circle's avatar. */
  avatar?: InputMaybe<Scalars['ID']['input']>
  /** Unique ID of a Circle's cover. */
  cover?: InputMaybe<Scalars['ID']['input']>
  /** A short description of this Circle. */
  description?: InputMaybe<Scalars['String']['input']>
  /** Human readable name of this Circle. */
  displayName?: InputMaybe<Scalars['String']['input']>
  /** Unique ID. */
  id?: InputMaybe<Scalars['ID']['input']>
  /** Slugified name of a Circle. */
  name?: InputMaybe<Scalars['String']['input']>
}

export type GQLPutCollectionInput = {
  cover?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
  pinned?: InputMaybe<Scalars['Boolean']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type GQLPutCommentInput = {
  comment: GQLCommentInput
  id?: InputMaybe<Scalars['ID']['input']>
}

export type GQLPutDraftInput = {
  accessType?: InputMaybe<GQLArticleAccessType>
  /** whether readers can comment */
  canComment?: InputMaybe<Scalars['Boolean']['input']>
  circle?: InputMaybe<Scalars['ID']['input']>
  collection?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>
  content?: InputMaybe<Scalars['String']['input']>
  cover?: InputMaybe<Scalars['ID']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
  /** whether publish to ISCN */
  iscnPublish?: InputMaybe<Scalars['Boolean']['input']>
  license?: InputMaybe<GQLArticleLicenseType>
  replyToDonator?: InputMaybe<Scalars['String']['input']>
  requestForDonation?: InputMaybe<Scalars['String']['input']>
  sensitive?: InputMaybe<Scalars['Boolean']['input']>
  summary?: InputMaybe<Scalars['String']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  title?: InputMaybe<Scalars['String']['input']>
}

export type GQLPutIcymiTopicInput = {
  articles?: InputMaybe<Array<Scalars['ID']['input']>>
  id?: InputMaybe<Scalars['ID']['input']>
  note?: InputMaybe<Scalars['String']['input']>
  pinAmount?: InputMaybe<Scalars['Int']['input']>
  state?: InputMaybe<GQLIcymiTopicState>
  title?: InputMaybe<Scalars['String']['input']>
}

export type GQLPutMomentInput = {
  assets: Array<Scalars['ID']['input']>
  content: Scalars['String']['input']
}

export type GQLPutOAuthClientInput = {
  avatar?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  grantTypes?: InputMaybe<Array<GQLGrantType>>
  id?: InputMaybe<Scalars['ID']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  redirectURIs?: InputMaybe<Array<Scalars['String']['input']>>
  scope?: InputMaybe<Array<Scalars['String']['input']>>
  secret?: InputMaybe<Scalars['String']['input']>
  user?: InputMaybe<Scalars['ID']['input']>
  website?: InputMaybe<Scalars['String']['input']>
}

export type GQLPutRemarkInput = {
  id: Scalars['ID']['input']
  remark: Scalars['String']['input']
  type: GQLRemarkTypes
}

export type GQLPutRestrictedUsersInput = {
  ids: Array<Scalars['ID']['input']>
  restrictions: Array<GQLUserRestrictionType>
}

export type GQLPutSkippedListItemInput = {
  archived?: InputMaybe<Scalars['Boolean']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
  type?: InputMaybe<GQLSkippedListItemType>
  value?: InputMaybe<Scalars['String']['input']>
}

export type GQLPutTagInput = {
  content?: InputMaybe<Scalars['String']['input']>
  cover?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
}

export type GQLPutWritingChallengeInput = {
  applicationPeriod?: InputMaybe<GQLDatetimeRangeInput>
  cover?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Array<GQLTranslationInput>>
  id?: InputMaybe<Scalars['ID']['input']>
  link?: InputMaybe<Scalars['String']['input']>
  name?: InputMaybe<Array<GQLTranslationInput>>
  stages?: InputMaybe<Array<GQLCampaignStageInput>>
  state?: InputMaybe<GQLCampaignState>
  writingPeriod?: InputMaybe<GQLDatetimeRangeInput>
}

export type GQLQuery = {
  __typename?: 'Query'
  article?: Maybe<GQLArticle>
  campaign?: Maybe<GQLCampaign>
  campaigns: GQLCampaignConnection
  circle?: Maybe<GQLCircle>
  exchangeRates?: Maybe<Array<GQLExchangeRate>>
  frequentSearch?: Maybe<Array<Scalars['String']['output']>>
  moment?: Maybe<GQLMoment>
  node?: Maybe<GQLNode>
  nodes?: Maybe<Array<GQLNode>>
  oauthClient?: Maybe<GQLOAuthClient>
  oauthRequestToken?: Maybe<Scalars['String']['output']>
  official: GQLOfficial
  oss: GQLOss
  search: GQLSearchResultConnection
  user?: Maybe<GQLUser>
  viewer?: Maybe<GQLUser>
}

export type GQLQueryArticleArgs = {
  input: GQLArticleInput
}

export type GQLQueryCampaignArgs = {
  input: GQLCampaignInput
}

export type GQLQueryCampaignsArgs = {
  input: GQLCampaignsInput
}

export type GQLQueryCircleArgs = {
  input: GQLCircleInput
}

export type GQLQueryExchangeRatesArgs = {
  input?: InputMaybe<GQLExchangeRatesInput>
}

export type GQLQueryFrequentSearchArgs = {
  input: GQLFrequentSearchInput
}

export type GQLQueryMomentArgs = {
  input: GQLMomentInput
}

export type GQLQueryNodeArgs = {
  input: GQLNodeInput
}

export type GQLQueryNodesArgs = {
  input: GQLNodesInput
}

export type GQLQueryOauthClientArgs = {
  input: GQLOAuthClientInput
}

export type GQLQuerySearchArgs = {
  input: GQLSearchInput
}

export type GQLQueryUserArgs = {
  input: GQLUserInput
}

export type GQLQuoteCurrency = 'HKD' | 'TWD' | 'USD'

export type GQLReadArticleInput = {
  id: Scalars['ID']['input']
}

export type GQLReadHistory = {
  __typename?: 'ReadHistory'
  article: GQLArticle
  readAt: Scalars['DateTime']['output']
}

export type GQLReadHistoryConnection = GQLConnection & {
  __typename?: 'ReadHistoryConnection'
  edges?: Maybe<Array<GQLReadHistoryEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLReadHistoryEdge = {
  __typename?: 'ReadHistoryEdge'
  cursor: Scalars['String']['output']
  node: GQLReadHistory
}

export type GQLRecentSearchConnection = GQLConnection & {
  __typename?: 'RecentSearchConnection'
  edges?: Maybe<Array<GQLRecentSearchEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLRecentSearchEdge = {
  __typename?: 'RecentSearchEdge'
  cursor: Scalars['String']['output']
  node: Scalars['String']['output']
}

export type GQLRecommendInput = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLFilterInput>
  first?: InputMaybe<Scalars['Int']['input']>
  oss?: InputMaybe<Scalars['Boolean']['input']>
  type?: InputMaybe<GQLAuthorsType>
}

/** Enums for types of recommend articles. */
export type GQLRecommendTypes = 'hottest' | 'icymi' | 'newest' | 'search'

export type GQLRecommendation = {
  __typename?: 'Recommendation'
  /** Global user list, sort by activities in recent 6 month. */
  authors: GQLUserConnection
  /** Activities based on user's following, sort by creation time. */
  following: GQLFollowingActivityConnection
  /** Global articles sort by latest activity time. */
  hottest: GQLArticleConnection
  /** Global circles sort by latest activity time. */
  hottestCircles: GQLCircleConnection
  /** Hottest tag list */
  hottestTags: GQLTagConnection
  /** 'In case you missed it' recommendation. */
  icymi: GQLArticleConnection
  /** 'In case you missed it' topic. */
  icymiTopic?: Maybe<GQLIcymiTopic>
  /** Global articles sort by publish time. */
  newest: GQLArticleConnection
  /** Global circles sort by created time. */
  newestCircles: GQLCircleConnection
  /**
   * Articles recommended based on recently read article tags.
   * @deprecated Merged into following
   */
  readTagsArticles: GQLArticleConnection
  /** Selected tag list */
  selectedTags: GQLTagConnection
  /** Global tag list, sort by activities in recent 14 days. */
  tags: GQLTagConnection
}

export type GQLRecommendationAuthorsArgs = {
  input: GQLRecommendInput
}

export type GQLRecommendationFollowingArgs = {
  input: GQLRecommendationFollowingInput
}

export type GQLRecommendationHottestArgs = {
  input: GQLConnectionArgs
}

export type GQLRecommendationHottestCirclesArgs = {
  input: GQLConnectionArgs
}

export type GQLRecommendationHottestTagsArgs = {
  input: GQLRecommendInput
}

export type GQLRecommendationIcymiArgs = {
  input: GQLConnectionArgs
}

export type GQLRecommendationNewestArgs = {
  input: GQLConnectionArgs
}

export type GQLRecommendationNewestCirclesArgs = {
  input: GQLConnectionArgs
}

export type GQLRecommendationReadTagsArticlesArgs = {
  input: GQLConnectionArgs
}

export type GQLRecommendationSelectedTagsArgs = {
  input: GQLRecommendInput
}

export type GQLRecommendationTagsArgs = {
  input: GQLRecommendInput
}

export type GQLRecommendationFollowingFilterInput = {
  type: GQLRecommendationFollowingFilterType
}

export type GQLRecommendationFollowingFilterType = 'article'

export type GQLRecommendationFollowingInput = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLRecommendationFollowingFilterInput>
  first?: InputMaybe<Scalars['Int']['input']>
}

export type GQLRefreshIpnsFeedInput = {
  /** refresh how many recent articles, default to 50 */
  numArticles?: InputMaybe<Scalars['Int']['input']>
  userName: Scalars['String']['input']
}

export type GQLRelatedDonationArticlesInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  oss?: InputMaybe<Scalars['Boolean']['input']>
  /** index of article list, min: 0, max: 49 */
  random?: InputMaybe<Scalars['Int']['input']>
}

export type GQLRemarkTypes =
  | 'Article'
  | 'Comment'
  | 'Feedback'
  | 'Report'
  | 'Tag'
  | 'User'

export type GQLRemoveSocialLoginInput = {
  type: GQLSocialAccountType
}

export type GQLRenameTagInput = {
  content: Scalars['String']['input']
  id: Scalars['ID']['input']
}

export type GQLReorderCollectionArticlesInput = {
  collection: Scalars['ID']['input']
  moves: Array<GQLReorderMoveInput>
}

export type GQLReorderMoveInput = {
  item: Scalars['ID']['input']
  /** The new position move to. To move item to the beginning of the list, set to 0. To the end of the list, set to the length of the list - 1. */
  newPosition: Scalars['Int']['input']
}

export type GQLReport = GQLNode & {
  __typename?: 'Report'
  createdAt: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  reason: GQLReportReason
  reporter: GQLUser
  target: GQLNode
}

export type GQLReportConnection = GQLConnection & {
  __typename?: 'ReportConnection'
  edges?: Maybe<Array<GQLReportEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLReportEdge = {
  __typename?: 'ReportEdge'
  cursor: Scalars['String']['output']
  node: GQLReport
}

export type GQLReportReason =
  | 'discrimination_insult_hatred'
  | 'illegal_advertising'
  | 'other'
  | 'pornography_involving_minors'
  | 'tort'

export type GQLResetLikerIdInput = {
  id: Scalars['ID']['input']
}

export type GQLResetPasswordInput = {
  codeId: Scalars['ID']['input']
  password: Scalars['String']['input']
  type?: InputMaybe<GQLResetPasswordType>
}

export type GQLResetPasswordType = 'account' | 'payment'

export type GQLResetWalletInput = {
  id: Scalars['ID']['input']
}

export type GQLResponse = GQLArticle | GQLComment

export type GQLResponseConnection = GQLConnection & {
  __typename?: 'ResponseConnection'
  edges?: Maybe<Array<GQLResponseEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLResponseEdge = {
  __typename?: 'ResponseEdge'
  cursor: Scalars['String']['output']
  node: GQLResponse
}

/** Enums for sorting responses. */
export type GQLResponseSort = 'newest' | 'oldest'

export type GQLResponsesInput = {
  after?: InputMaybe<Scalars['String']['input']>
  articleOnly?: InputMaybe<Scalars['Boolean']['input']>
  before?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  includeAfter?: InputMaybe<Scalars['Boolean']['input']>
  includeBefore?: InputMaybe<Scalars['Boolean']['input']>
  sort?: InputMaybe<GQLResponseSort>
}

/** Enums for user roles. */
export type GQLRole = 'admin' | 'user' | 'vistor'

export type GQLSearchApiVersion = 'v20230301' | 'v20230601'

export type GQLSearchExclude = 'blocked'

export type GQLSearchFilter = {
  authorId?: InputMaybe<Scalars['ID']['input']>
}

export type GQLSearchInput = {
  after?: InputMaybe<Scalars['String']['input']>
  /** deprecated, make no effect */
  coefficients?: InputMaybe<Scalars['String']['input']>
  /** specific condition for rule data out */
  exclude?: InputMaybe<GQLSearchExclude>
  /** extra query filter for searching */
  filter?: InputMaybe<GQLSearchFilter>
  first?: InputMaybe<Scalars['Int']['input']>
  /** should include tags used by author */
  includeAuthorTags?: InputMaybe<Scalars['Boolean']['input']>
  /** search keyword */
  key: Scalars['String']['input']
  oss?: InputMaybe<Scalars['Boolean']['input']>
  quicksearch?: InputMaybe<Scalars['Boolean']['input']>
  /** whether this search operation should be recorded in search history */
  record?: InputMaybe<Scalars['Boolean']['input']>
  /** types of search target */
  type: GQLSearchTypes
  /** use the api version; default to use latest stable version is v20230301 */
  version?: InputMaybe<GQLSearchApiVersion>
}

export type GQLSearchResultConnection = GQLConnection & {
  __typename?: 'SearchResultConnection'
  edges?: Maybe<Array<GQLSearchResultEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLSearchResultEdge = {
  __typename?: 'SearchResultEdge'
  cursor: Scalars['String']['output']
  node: GQLNode
}

export type GQLSearchTypes = 'Article' | 'Tag' | 'User'

export type GQLSendVerificationCodeInput = {
  email: Scalars['String']['input']
  /** email content language */
  language?: InputMaybe<GQLUserLanguage>
  /**
   * Redirect URL embedded in the verification email,
   * use code instead if not provided.
   */
  redirectUrl?: InputMaybe<Scalars['String']['input']>
  token?: InputMaybe<Scalars['String']['input']>
  type: GQLVerificationCodeType
}

export type GQLSetBoostInput = {
  boost: Scalars['Float']['input']
  id: Scalars['ID']['input']
  type: GQLBoostTypes
}

export type GQLSetCurrencyInput = {
  currency?: InputMaybe<GQLQuoteCurrency>
}

export type GQLSetEmailInput = {
  email: Scalars['String']['input']
}

export type GQLSetFeatureInput = {
  flag: GQLFeatureFlag
  name: GQLFeatureName
}

export type GQLSetPasswordInput = {
  password: Scalars['String']['input']
}

export type GQLSetUserNameInput = {
  userName: Scalars['String']['input']
}

export type GQLSigningMessagePurpose =
  | 'airdrop'
  | 'claimLogbook'
  | 'connect'
  | 'login'
  | 'signup'

export type GQLSigningMessageResult = {
  __typename?: 'SigningMessageResult'
  createdAt: Scalars['DateTime']['output']
  expiredAt: Scalars['DateTime']['output']
  nonce: Scalars['String']['output']
  purpose: GQLSigningMessagePurpose
  signingMessage: Scalars['String']['output']
}

export type GQLSingleFileUploadInput = {
  draft?: InputMaybe<Scalars['Boolean']['input']>
  entityId?: InputMaybe<Scalars['ID']['input']>
  entityType: GQLEntityType
  file?: InputMaybe<Scalars['Upload']['input']>
  type: GQLAssetType
  url?: InputMaybe<Scalars['String']['input']>
}

export type GQLSkippedListItem = {
  __typename?: 'SkippedListItem'
  archived: Scalars['Boolean']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['ID']['output']
  type: GQLSkippedListItemType
  updatedAt: Scalars['DateTime']['output']
  uuid: Scalars['ID']['output']
  value: Scalars['String']['output']
}

export type GQLSkippedListItemEdge = {
  __typename?: 'SkippedListItemEdge'
  cursor: Scalars['String']['output']
  node?: Maybe<GQLSkippedListItem>
}

export type GQLSkippedListItemType = 'agent_hash' | 'domain' | 'email'

export type GQLSkippedListItemsConnection = GQLConnection & {
  __typename?: 'SkippedListItemsConnection'
  edges?: Maybe<Array<GQLSkippedListItemEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLSkippedListItemsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  type?: InputMaybe<GQLSkippedListItemType>
}

export type GQLSocialAccount = {
  __typename?: 'SocialAccount'
  email?: Maybe<Scalars['String']['output']>
  type: GQLSocialAccountType
  userName?: Maybe<Scalars['String']['output']>
}

export type GQLSocialAccountType = 'Facebook' | 'Google' | 'Twitter'

export type GQLSocialLoginInput = {
  authorizationCode?: InputMaybe<Scalars['String']['input']>
  /** OAuth2 PKCE code_verifier for Facebook and Twitter */
  codeVerifier?: InputMaybe<Scalars['String']['input']>
  /** used in register */
  language?: InputMaybe<GQLUserLanguage>
  /** OIDC nonce for Google */
  nonce?: InputMaybe<Scalars['String']['input']>
  /** oauth token/verifier in OAuth1.0a for Twitter */
  oauth1Credential?: InputMaybe<GQLOauth1CredentialInput>
  referralCode?: InputMaybe<Scalars['String']['input']>
  type: GQLSocialAccountType
}

export type GQLStripeAccount = {
  __typename?: 'StripeAccount'
  id: Scalars['ID']['output']
  loginUrl: Scalars['String']['output']
}

export type GQLStripeAccountCountry =
  | 'Australia'
  | 'Austria'
  | 'Belgium'
  | 'Bulgaria'
  | 'Canada'
  | 'Cyprus'
  | 'Denmark'
  | 'Estonia'
  | 'Finland'
  | 'France'
  | 'Germany'
  | 'Greece'
  | 'HongKong'
  | 'Ireland'
  | 'Italy'
  | 'Latvia'
  | 'Lithuania'
  | 'Luxembourg'
  | 'Malta'
  | 'Netherlands'
  | 'NewZealand'
  | 'Norway'
  | 'Poland'
  | 'Portugal'
  | 'Romania'
  | 'Singapore'
  | 'Slovakia'
  | 'Slovenia'
  | 'Spain'
  | 'Sweden'
  | 'UnitedKingdom'
  | 'UnitedStates'

export type GQLSubmitReportInput = {
  reason: GQLReportReason
  targetId: Scalars['ID']['input']
}

export type GQLSubscribeCircleInput = {
  /** Unique ID. */
  id: Scalars['ID']['input']
  /** Wallet password. */
  password?: InputMaybe<Scalars['String']['input']>
}

export type GQLSubscribeCircleResult = {
  __typename?: 'SubscribeCircleResult'
  circle: GQLCircle
  /** client secret for SetupIntent. */
  client_secret?: Maybe<Scalars['String']['output']>
}

/** This type contains content, count and related data of an article tag. */
export type GQLTag = GQLNode & {
  __typename?: 'Tag'
  /** List of how many articles were attached with this tag. */
  articles: GQLArticleConnection
  /** Content of this tag. */
  content: Scalars['String']['output']
  /** Tag's cover link. */
  cover?: Maybe<Scalars['String']['output']>
  /** Time of this tag was created. */
  createdAt: Scalars['DateTime']['output']
  /** Creator of this tag. */
  creator?: Maybe<GQLUser>
  deleted: Scalars['Boolean']['output']
  /** Description of this tag. */
  description?: Maybe<Scalars['String']['output']>
  /** Editors of this tag. */
  editors?: Maybe<Array<GQLUser>>
  /** Followers of this tag. */
  followers: GQLUserConnection
  /** Unique id of this tag. */
  id: Scalars['ID']['output']
  /** This value determines if current viewer is following or not. */
  isFollower?: Maybe<Scalars['Boolean']['output']>
  /** This value determines if it is official. */
  isOfficial?: Maybe<Scalars['Boolean']['output']>
  /** Counts of this tag. */
  numArticles: Scalars['Int']['output']
  numAuthors: Scalars['Int']['output']
  oss: GQLTagOss
  /** Owner of this tag. */
  owner?: Maybe<GQLUser>
  /** Participants of this tag. */
  participants: GQLUserConnection
  /** Tags recommended based on relations to current tag. */
  recommended: GQLTagConnection
  remark?: Maybe<Scalars['String']['output']>
  /** This value determines if this article is selected by this tag or not. */
  selected: Scalars['Boolean']['output']
}

/** This type contains content, count and related data of an article tag. */
export type GQLTagArticlesArgs = {
  input: GQLTagArticlesInput
}

/** This type contains content, count and related data of an article tag. */
export type GQLTagEditorsArgs = {
  input?: InputMaybe<GQLTagEditorsInput>
}

/** This type contains content, count and related data of an article tag. */
export type GQLTagFollowersArgs = {
  input: GQLConnectionArgs
}

/** This type contains content, count and related data of an article tag. */
export type GQLTagParticipantsArgs = {
  input: GQLConnectionArgs
}

/** This type contains content, count and related data of an article tag. */
export type GQLTagRecommendedArgs = {
  input: GQLConnectionArgs
}

/** This type contains content, count and related data of an article tag. */
export type GQLTagSelectedArgs = {
  input: GQLTagSelectedInput
}

export type GQLTagArticlesInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  oss?: InputMaybe<Scalars['Boolean']['input']>
  selected?: InputMaybe<Scalars['Boolean']['input']>
  sortBy?: InputMaybe<GQLTagArticlesSortBy>
}

export type GQLTagArticlesSortBy = 'byCreatedAtDesc' | 'byHottestDesc'

export type GQLTagConnection = GQLConnection & {
  __typename?: 'TagConnection'
  edges?: Maybe<Array<GQLTagEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLTagEdge = {
  __typename?: 'TagEdge'
  cursor: Scalars['String']['output']
  node: GQLTag
}

export type GQLTagEditorsInput = {
  excludeAdmin?: InputMaybe<Scalars['Boolean']['input']>
  excludeOwner?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLTagOss = {
  __typename?: 'TagOSS'
  boost: Scalars['Float']['output']
  score: Scalars['Float']['output']
  selected: Scalars['Boolean']['output']
}

export type GQLTagSelectedInput = {
  id?: InputMaybe<Scalars['ID']['input']>
  mediaHash?: InputMaybe<Scalars['String']['input']>
}

export type GQLTagsInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  sort?: InputMaybe<GQLTagsSort>
}

/** Enums for sorting tags. */
export type GQLTagsSort = 'hottest' | 'newest' | 'oldest'

export type GQLToggleCircleMemberInput = {
  /** Toggle value. */
  enabled: Scalars['Boolean']['input']
  /** Unique ID. */
  id: Scalars['ID']['input']
  /** Unique ID of target user. */
  targetId: Scalars['ID']['input']
}

/** Common input to toggle single item for `toggleXXX` mutations */
export type GQLToggleItemInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>
  id: Scalars['ID']['input']
}

export type GQLToggleRecommendInput = {
  enabled: Scalars['Boolean']['input']
  id: Scalars['ID']['input']
  type?: InputMaybe<GQLRecommendTypes>
}

export type GQLToggleSeedingUsersInput = {
  enabled: Scalars['Boolean']['input']
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type GQLToggleUsersBadgeInput = {
  enabled: Scalars['Boolean']['input']
  ids?: InputMaybe<Array<Scalars['ID']['input']>>
  type: GQLBadgeType
}

export type GQLTopDonatorConnection = GQLConnection & {
  __typename?: 'TopDonatorConnection'
  edges?: Maybe<Array<GQLTopDonatorEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLTopDonatorEdge = {
  __typename?: 'TopDonatorEdge'
  cursor: Scalars['String']['output']
  donationCount: Scalars['Int']['output']
  node: GQLUser
}

export type GQLTopDonatorFilter = {
  inRangeEnd?: InputMaybe<Scalars['DateTime']['input']>
  inRangeStart?: InputMaybe<Scalars['DateTime']['input']>
}

export type GQLTopDonatorInput = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLTopDonatorFilter>
  first?: InputMaybe<Scalars['Int']['input']>
}

export type GQLTransaction = {
  __typename?: 'Transaction'
  amount: Scalars['Float']['output']
  /** blockchain transaction info of ERC20/native token payment transaction */
  blockchainTx?: Maybe<GQLBlockchainTransaction>
  /** Timestamp of transaction. */
  createdAt: Scalars['DateTime']['output']
  currency: GQLTransactionCurrency
  fee: Scalars['Float']['output']
  id: Scalars['ID']['output']
  /** Message for end user, including reason of failure. */
  message?: Maybe<Scalars['String']['output']>
  purpose: GQLTransactionPurpose
  /** Recipient of transaction. */
  recipient?: Maybe<GQLUser>
  /** Sender of transaction. */
  sender?: Maybe<GQLUser>
  state: GQLTransactionState
  /** Related target article or transaction. */
  target?: Maybe<GQLTransactionTarget>
}

export type GQLTransactionConnection = GQLConnection & {
  __typename?: 'TransactionConnection'
  edges?: Maybe<Array<GQLTransactionEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLTransactionCurrency = 'HKD' | 'LIKE' | 'USDT'

export type GQLTransactionEdge = {
  __typename?: 'TransactionEdge'
  cursor: Scalars['String']['output']
  node: GQLTransaction
}

export type GQLTransactionNotice = GQLNotice & {
  __typename?: 'TransactionNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLTransaction
  type: GQLTransactionNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLTransactionNoticeType = 'PaymentReceivedDonation'

export type GQLTransactionPurpose =
  | 'addCredit'
  | 'dispute'
  | 'donation'
  | 'payout'
  | 'payoutReversal'
  | 'refund'
  | 'subscriptionSplit'

export type GQLTransactionState =
  | 'canceled'
  | 'failed'
  | 'pending'
  | 'succeeded'

export type GQLTransactionTarget = GQLArticle | GQLCircle | GQLTransaction

export type GQLTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLTransactionsFilter>
  first?: InputMaybe<Scalars['Int']['input']>
  /** deprecated, use TransactionsFilter.id instead. */
  id?: InputMaybe<Scalars['ID']['input']>
  /** deprecated, use TransactionsFilter.states instead. */
  states?: InputMaybe<Array<GQLTransactionState>>
}

export type GQLTransactionsFilter = {
  currency?: InputMaybe<GQLTransactionCurrency>
  id?: InputMaybe<Scalars['ID']['input']>
  purpose?: InputMaybe<GQLTransactionPurpose>
  states?: InputMaybe<Array<GQLTransactionState>>
}

export type GQLTransactionsReceivedByArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  purpose: GQLTransactionPurpose
  senderId?: InputMaybe<Scalars['ID']['input']>
}

export type GQLTranslatedAnnouncement = {
  __typename?: 'TranslatedAnnouncement'
  content?: Maybe<Scalars['String']['output']>
  cover?: Maybe<Scalars['String']['output']>
  language: GQLUserLanguage
  link?: Maybe<Scalars['String']['output']>
  title?: Maybe<Scalars['String']['output']>
}

export type GQLTranslatedAnnouncementInput = {
  content?: InputMaybe<Scalars['String']['input']>
  cover?: InputMaybe<Scalars['String']['input']>
  language: GQLUserLanguage
  link?: InputMaybe<Scalars['String']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type GQLTranslationArgs = {
  language: GQLUserLanguage
}

export type GQLTranslationInput = {
  language: GQLUserLanguage
  text: Scalars['String']['input']
}

export type GQLUnbindLikerIdInput = {
  id: Scalars['ID']['input']
  likerId: Scalars['String']['input']
}

export type GQLUnlikeMomentInput = {
  id: Scalars['ID']['input']
}

export type GQLUnpinCommentInput = {
  id: Scalars['ID']['input']
}

export type GQLUnsubscribeCircleInput = {
  /** Unique ID. */
  id: Scalars['ID']['input']
}

export type GQLUnvoteCommentInput = {
  id: Scalars['ID']['input']
}

export type GQLUpdateArticleSensitiveInput = {
  id: Scalars['ID']['input']
  sensitive: Scalars['Boolean']['input']
}

export type GQLUpdateArticleStateInput = {
  id: Scalars['ID']['input']
  state: GQLArticleState
}

export type GQLUpdateArticlesTagsInput = {
  articles?: InputMaybe<Array<Scalars['ID']['input']>>
  id: Scalars['ID']['input']
  isSelected: Scalars['Boolean']['input']
}

export type GQLUpdateCampaignApplicationStateInput = {
  campaign: Scalars['ID']['input']
  state: GQLCampaignApplicationState
  user: Scalars['ID']['input']
}

export type GQLUpdateCommentsStateInput = {
  ids: Array<Scalars['ID']['input']>
  state: GQLCommentState
}

export type GQLUpdateNotificationSettingInput = {
  enabled: Scalars['Boolean']['input']
  type: GQLNotificationSettingType
}

export type GQLUpdateTagSettingInput = {
  editors?: InputMaybe<Array<Scalars['ID']['input']>>
  id: Scalars['ID']['input']
  type: GQLUpdateTagSettingType
}

export type GQLUpdateTagSettingType =
  | 'add_editor'
  | 'adopt'
  | 'leave'
  | 'leave_editor'
  | 'remove_editor'

export type GQLUpdateUserExtraInput = {
  id: Scalars['ID']['input']
  referralCode?: InputMaybe<Scalars['String']['input']>
}

export type GQLUpdateUserInfoInput = {
  agreeOn?: InputMaybe<Scalars['Boolean']['input']>
  avatar?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  displayName?: InputMaybe<Scalars['String']['input']>
  language?: InputMaybe<GQLUserLanguage>
  paymentPassword?: InputMaybe<Scalars['String']['input']>
  paymentPointer?: InputMaybe<Scalars['String']['input']>
  profileCover?: InputMaybe<Scalars['ID']['input']>
  referralCode?: InputMaybe<Scalars['String']['input']>
  /** @deprecated use 'setUserName' instead */
  userName?: InputMaybe<Scalars['String']['input']>
}

export type GQLUpdateUserRoleInput = {
  id: Scalars['ID']['input']
  role: GQLUserRole
}

export type GQLUpdateUserStateInput = {
  banDays?: InputMaybe<Scalars['Int']['input']>
  emails?: InputMaybe<Array<Scalars['String']['input']>>
  id?: InputMaybe<Scalars['ID']['input']>
  password?: InputMaybe<Scalars['String']['input']>
  state: GQLUserState
}

export type GQLUser = GQLNode & {
  __typename?: 'User'
  /** Record of user activity, only accessable by current user. */
  activity: GQLUserActivity
  /** user data analytics, only accessable by current user. */
  analytics: GQLUserAnalytics
  /** Articles authored by current user. */
  articles: GQLArticleConnection
  /** URL for user avatar. */
  avatar?: Maybe<Scalars['String']['output']>
  /** Users that blocked by current user. */
  blockList: GQLUserConnection
  /** collections authored by current user. */
  collections: GQLCollectionConnection
  /** Articles current user commented on */
  commentedArticles: GQLArticleConnection
  /** Display name on user profile, can be duplicated. */
  displayName?: Maybe<Scalars['String']['output']>
  /** Drafts authored by current user. */
  drafts: GQLDraftConnection
  /** Followers of this user. */
  followers: GQLUserConnection
  /** Following contents of this user. */
  following: GQLFollowing
  /** Global id of an user. */
  id: Scalars['ID']['output']
  /** User information. */
  info: GQLUserInfo
  /** Whether current user is blocked by viewer. */
  isBlocked: Scalars['Boolean']['output']
  /** Whether current user is blocking viewer. */
  isBlocking: Scalars['Boolean']['output']
  /** Whether viewer is following current user. */
  isFollowee: Scalars['Boolean']['output']
  /** Whether current user is following viewer. */
  isFollower: Scalars['Boolean']['output']
  /** user latest articles or collections */
  latestWorks: Array<GQLPinnableWork>
  /** Liker info of current user */
  liker: GQLLiker
  /** LikerID of LikeCoin, being used by LikeCoin OAuth */
  likerId?: Maybe<Scalars['String']['output']>
  notices: GQLNoticeConnection
  oss: GQLUserOss
  /** Circles belong to current user. */
  ownCircles?: Maybe<Array<GQLCircle>>
  /** Payment pointer that resolves to Open Payments endpoints */
  paymentPointer?: Maybe<Scalars['String']['output']>
  /** user pinned articles or collections */
  pinnedWorks: Array<GQLPinnableWork>
  /** Recommendations for current user. */
  recommendation: GQLRecommendation
  remark?: Maybe<Scalars['String']['output']>
  /** User settings. */
  settings: GQLUserSettings
  /** Status of current user. */
  status?: Maybe<GQLUserStatus>
  /** Circles whiches user has subscribed. */
  subscribedCircles: GQLCircleConnection
  /** Artilces current user subscribed to. */
  subscriptions: GQLArticleConnection
  /** Tags by usage order of current user. */
  tags: GQLTagConnection
  /** Global unique user name of a user. */
  userName?: Maybe<Scalars['String']['output']>
  /** User Wallet */
  wallet: GQLWallet
  /** Articles and moments authored by current user. */
  writings: GQLWritingConnection
}

export type GQLUserArticlesArgs = {
  input: GQLUserArticlesInput
}

export type GQLUserBlockListArgs = {
  input: GQLConnectionArgs
}

export type GQLUserCollectionsArgs = {
  input: GQLConnectionArgs
}

export type GQLUserCommentedArticlesArgs = {
  input: GQLConnectionArgs
}

export type GQLUserDraftsArgs = {
  input: GQLConnectionArgs
}

export type GQLUserFollowersArgs = {
  input: GQLConnectionArgs
}

export type GQLUserNoticesArgs = {
  input: GQLConnectionArgs
}

export type GQLUserSubscribedCirclesArgs = {
  input: GQLConnectionArgs
}

export type GQLUserSubscriptionsArgs = {
  input: GQLConnectionArgs
}

export type GQLUserTagsArgs = {
  input: GQLConnectionArgs
}

export type GQLUserWritingsArgs = {
  input: GQLWritingInput
}

export type GQLUserActivity = {
  __typename?: 'UserActivity'
  /** Appreciations current user received. */
  appreciationsReceived: GQLAppreciationConnection
  /** Total number of appreciation current user received. */
  appreciationsReceivedTotal: Scalars['Int']['output']
  /** Appreciations current user gave. */
  appreciationsSent: GQLAppreciationConnection
  /** Total number of appreciation current user gave. */
  appreciationsSentTotal: Scalars['Int']['output']
  /** User reading history. */
  history: GQLReadHistoryConnection
  /** User search history. */
  recentSearches: GQLRecentSearchConnection
}

export type GQLUserActivityAppreciationsReceivedArgs = {
  input: GQLConnectionArgs
}

export type GQLUserActivityAppreciationsSentArgs = {
  input: GQLConnectionArgs
}

export type GQLUserActivityHistoryArgs = {
  input: GQLConnectionArgs
}

export type GQLUserActivityRecentSearchesArgs = {
  input: GQLConnectionArgs
}

export type GQLUserAddArticleTagActivity = {
  __typename?: 'UserAddArticleTagActivity'
  actor: GQLUser
  createdAt: Scalars['DateTime']['output']
  /** Article added to tag */
  node: GQLArticle
  /** Tag added by article */
  target: GQLTag
}

export type GQLUserAnalytics = {
  __typename?: 'UserAnalytics'
  /** Top donators of current user. */
  topDonators: GQLTopDonatorConnection
}

export type GQLUserAnalyticsTopDonatorsArgs = {
  input: GQLTopDonatorInput
}

export type GQLUserArticlesFilter = {
  state?: InputMaybe<GQLArticleState>
}

export type GQLUserArticlesInput = {
  after?: InputMaybe<Scalars['String']['input']>
  filter?: InputMaybe<GQLUserArticlesFilter>
  first?: InputMaybe<Scalars['Int']['input']>
  sort?: InputMaybe<GQLUserArticlesSort>
}

export type GQLUserArticlesSort =
  | 'mostAppreciations'
  | 'mostComments'
  | 'mostDonations'
  | 'mostReaders'
  | 'newest'

export type GQLUserBroadcastCircleActivity = {
  __typename?: 'UserBroadcastCircleActivity'
  actor: GQLUser
  createdAt: Scalars['DateTime']['output']
  /** Comment broadcast by actor */
  node: GQLComment
  /** Circle that comment belongs to */
  target: GQLCircle
}

export type GQLUserConnection = GQLConnection & {
  __typename?: 'UserConnection'
  edges?: Maybe<Array<GQLUserEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLUserCreateCircleActivity = {
  __typename?: 'UserCreateCircleActivity'
  actor: GQLUser
  createdAt: Scalars['DateTime']['output']
  /** Circle created by actor */
  node: GQLCircle
}

export type GQLUserEdge = {
  __typename?: 'UserEdge'
  cursor: Scalars['String']['output']
  node: GQLUser
}

export type GQLUserGroup = 'a' | 'b'

export type GQLUserInfo = {
  __typename?: 'UserInfo'
  /** Timestamp of user agreement. */
  agreeOn?: Maybe<Scalars['DateTime']['output']>
  /** User badges. */
  badges?: Maybe<Array<GQLBadge>>
  /** Timestamp of registration. */
  createdAt?: Maybe<Scalars['DateTime']['output']>
  /** Connected wallet. */
  cryptoWallet?: Maybe<GQLCryptoWallet>
  /** User desciption. */
  description?: Maybe<Scalars['String']['output']>
  /** User email. */
  email?: Maybe<Scalars['String']['output']>
  /** Weather user email is verified. */
  emailVerified: Scalars['Boolean']['output']
  /** Login address */
  ethAddress?: Maybe<Scalars['String']['output']>
  /** saved tags for showing on profile page, API allows up to 100, front-end lock'ed at lower limit */
  featuredTags?: Maybe<Array<GQLTag>>
  /** Type of group. */
  group: GQLUserGroup
  /** the ipnsKey (`ipfs.io/ipns/<ipnsKey>/...`) for feed.json / rss.xml / index */
  ipnsKey?: Maybe<Scalars['String']['output']>
  isWalletAuth: Scalars['Boolean']['output']
  /** Cover of profile page. */
  profileCover?: Maybe<Scalars['String']['output']>
  /** User connected social accounts. */
  socialAccounts: Array<GQLSocialAccount>
  /** Is user name editable. */
  userNameEditable: Scalars['Boolean']['output']
}

export type GQLUserInfoFields =
  | 'agreeOn'
  | 'avatar'
  | 'description'
  | 'displayName'
  | 'email'

export type GQLUserInput = {
  ethAddress?: InputMaybe<Scalars['String']['input']>
  userName?: InputMaybe<Scalars['String']['input']>
  /** used for case insensitive username search  */
  userNameCaseIgnore?: InputMaybe<Scalars['Boolean']['input']>
}

export type GQLUserLanguage = 'en' | 'zh_hans' | 'zh_hant'

export type GQLUserLoginInput = {
  email: Scalars['String']['input']
  password: Scalars['String']['input']
}

export type GQLUserNotice = GQLNotice & {
  __typename?: 'UserNotice'
  /** List of notice actors. */
  actors?: Maybe<Array<GQLUser>>
  /** Time of this notice was created. */
  createdAt: Scalars['DateTime']['output']
  /** Unique ID of this notice. */
  id: Scalars['ID']['output']
  target: GQLUser
  type: GQLUserNoticeType
  /** The value determines if the notice is unread or not. */
  unread: Scalars['Boolean']['output']
}

export type GQLUserNoticeType = 'UserNewFollower'

export type GQLUserOss = {
  __typename?: 'UserOSS'
  boost: Scalars['Float']['output']
  restrictions: Array<GQLUserRestriction>
  score: Scalars['Float']['output']
}

export type GQLUserPostMomentActivity = {
  __typename?: 'UserPostMomentActivity'
  actor: GQLUser
  createdAt: Scalars['DateTime']['output']
  /** Another 2 moments posted by actor */
  more: Array<GQLMoment>
  /** Moment posted by actor */
  node: GQLMoment
}

export type GQLUserPublishArticleActivity = {
  __typename?: 'UserPublishArticleActivity'
  actor: GQLUser
  createdAt: Scalars['DateTime']['output']
  /** Article published by actor */
  node: GQLArticle
}

export type GQLUserRecommendationActivity = {
  __typename?: 'UserRecommendationActivity'
  /** Recommended users */
  nodes?: Maybe<Array<GQLUser>>
  /** The source type of recommendation */
  source?: Maybe<GQLUserRecommendationActivitySource>
}

export type GQLUserRecommendationActivitySource = 'UserFollowing'

export type GQLUserRegisterInput = {
  codeId: Scalars['ID']['input']
  description?: InputMaybe<Scalars['String']['input']>
  displayName: Scalars['String']['input']
  email: Scalars['String']['input']
  password: Scalars['String']['input']
  referralCode?: InputMaybe<Scalars['String']['input']>
  userName?: InputMaybe<Scalars['String']['input']>
}

export type GQLUserRestriction = {
  __typename?: 'UserRestriction'
  createdAt: Scalars['DateTime']['output']
  type: GQLUserRestrictionType
}

export type GQLUserRestrictionType = 'articleHottest' | 'articleNewest'

export type GQLUserRole = 'admin' | 'user'

export type GQLUserSettings = {
  __typename?: 'UserSettings'
  /** User currency preference. */
  currency: GQLQuoteCurrency
  /** User language setting. */
  language: GQLUserLanguage
  /** Notification settings. */
  notification?: Maybe<GQLNotificationSetting>
}

export type GQLUserState = 'active' | 'archived' | 'banned' | 'frozen'

export type GQLUserStatus = {
  __typename?: 'UserStatus'
  /** Number of articles published by user */
  articleCount: Scalars['Int']['output']
  /** Number of chances for the user to change email in a nature day. Reset in UTC+8 0:00 */
  changeEmailTimesLeft: Scalars['Int']['output']
  /** Number of comments posted by user. */
  commentCount: Scalars['Int']['output']
  /** Number of articles donated by user */
  donatedArticleCount: Scalars['Int']['output']
  /** Weather login password is set for email login. */
  hasEmailLoginPassword: Scalars['Boolean']['output']
  /** Whether user already set payment password. */
  hasPaymentPassword: Scalars['Boolean']['output']
  /** Number of times of donations received by user */
  receivedDonationCount: Scalars['Int']['output']
  /** User role and access level. */
  role: GQLUserRole
  /** User state. */
  state: GQLUserState
  /** Number of referred user registration count (in Digital Nomad Campaign). */
  totalReferredCount: Scalars['Int']['output']
  /** Number of total written words. */
  totalWordCount: Scalars['Int']['output']
  /** Whether there are unread activities from following. */
  unreadFollowing: Scalars['Boolean']['output']
  /** Number of unread notices. */
  unreadNoticeCount: Scalars['Int']['output']
}

export type GQLVerificationCodeType =
  | 'email_otp'
  | 'email_reset'
  | 'email_reset_confirm'
  | 'email_verify'
  | 'password_reset'
  | 'payment_password_reset'
  | 'register'

export type GQLVerifyEmailInput = {
  code: Scalars['String']['input']
  email: Scalars['String']['input']
}

/** Enums for vote types. */
export type GQLVote = 'down' | 'up'

export type GQLVoteCommentInput = {
  id: Scalars['ID']['input']
  vote: GQLVote
}

export type GQLWallet = {
  __typename?: 'Wallet'
  balance: GQLBalance
  /** The last four digits of the card. */
  cardLast4?: Maybe<Scalars['String']['output']>
  /** URL of Stripe Dashboard to manage subscription invoice and payment method */
  customerPortal?: Maybe<Scalars['String']['output']>
  /** Account of Stripe Connect to manage payout */
  stripeAccount?: Maybe<GQLStripeAccount>
  transactions: GQLTransactionConnection
}

export type GQLWalletTransactionsArgs = {
  input: GQLTransactionsArgs
}

export type GQLWalletLoginInput = {
  /**
   * email verification code, required for wallet register
   * @deprecated No longer in use
   */
  codeId?: InputMaybe<Scalars['ID']['input']>
  /**
   * required for wallet register
   * @deprecated No longer in use
   */
  email?: InputMaybe<Scalars['String']['input']>
  ethAddress: Scalars['String']['input']
  /** used in register */
  language?: InputMaybe<GQLUserLanguage>
  /** nonce from generateSigningMessage */
  nonce: Scalars['String']['input']
  referralCode?: InputMaybe<Scalars['String']['input']>
  /** sign'ed by wallet */
  signature: Scalars['String']['input']
  /** the message being sign'ed, including nonce */
  signedMessage: Scalars['String']['input']
}

export type GQLWriting = GQLArticle | GQLMoment

export type GQLWritingChallenge = GQLCampaign &
  GQLNode & {
    __typename?: 'WritingChallenge'
    applicationPeriod: GQLDatetimeRange
    applicationState?: Maybe<GQLCampaignApplicationState>
    articles: GQLArticleConnection
    cover?: Maybe<Scalars['String']['output']>
    description: Scalars['String']['output']
    id: Scalars['ID']['output']
    link: Scalars['String']['output']
    name: Scalars['String']['output']
    participants: GQLUserConnection
    shortHash: Scalars['String']['output']
    stages: Array<Maybe<GQLCampaignStage>>
    state: GQLCampaignState
    writingPeriod: GQLDatetimeRange
  }

export type GQLWritingChallengeArticlesArgs = {
  input?: InputMaybe<GQLCampaignArticlesInput>
}

export type GQLWritingChallengeParticipantsArgs = {
  input: GQLConnectionArgs
}

export type GQLWritingConnection = GQLConnection & {
  __typename?: 'WritingConnection'
  edges?: Maybe<Array<GQLWritingEdge>>
  pageInfo: GQLPageInfo
  totalCount: Scalars['Int']['output']
}

export type GQLWritingEdge = {
  __typename?: 'WritingEdge'
  cursor: Scalars['String']['output']
  node: GQLWriting
}

export type GQLWritingInput = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
}

export type WithIndex<TObject> = TObject & Record<string, any>
export type ResolversObject<TObject> = WithIndex<TObject>

export type ResolverTypeWrapper<T> = Promise<T> | T

export type Resolver<
  TResult,
  TParent = {},
  TContext = {},
  TArgs = {}
> = ResolverFn<TResult, TParent, TContext, TArgs>

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {}
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {}
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

/** Mapping of union types */
export type GQLResolversUnionTypes<RefType extends Record<string, unknown>> =
  ResolversObject<{
    FollowingActivity:
      | (Omit<GQLArticleRecommendationActivity, 'nodes'> & {
          nodes?: Maybe<Array<RefType['Article']>>
        })
      | (Omit<GQLCircleRecommendationActivity, 'nodes'> & {
          nodes?: Maybe<Array<RefType['Circle']>>
        })
      | (Omit<GQLUserAddArticleTagActivity, 'actor' | 'node' | 'target'> & {
          actor: RefType['User']
          node: RefType['Article']
          target: RefType['Tag']
        })
      | (Omit<GQLUserBroadcastCircleActivity, 'actor' | 'node' | 'target'> & {
          actor: RefType['User']
          node: RefType['Comment']
          target: RefType['Circle']
        })
      | (Omit<GQLUserCreateCircleActivity, 'actor' | 'node'> & {
          actor: RefType['User']
          node: RefType['Circle']
        })
      | (Omit<GQLUserPostMomentActivity, 'actor' | 'more' | 'node'> & {
          actor: RefType['User']
          more: Array<RefType['Moment']>
          node: RefType['Moment']
        })
      | (Omit<GQLUserPublishArticleActivity, 'actor' | 'node'> & {
          actor: RefType['User']
          node: RefType['Article']
        })
      | (Omit<GQLUserRecommendationActivity, 'nodes'> & {
          nodes?: Maybe<Array<RefType['User']>>
        })
    Invitee: GQLPerson | UserModel
    Response: ArticleModel | CommentModel
    TransactionTarget: ArticleModel | CircleModel | TransactionModel
    Writing: ArticleModel | MomentModel
  }>

/** Mapping of interface types */
export type GQLResolversInterfaceTypes<
  RefType extends Record<string, unknown>
> = ResolversObject<{
  Campaign: CampaignModel
  Connection:
    | (Omit<GQLAppreciationConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['AppreciationEdge']>>
      })
    | (Omit<GQLArticleConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['ArticleEdge']>>
      })
    | (Omit<GQLArticleVersionsConnection, 'edges'> & {
        edges: Array<Maybe<RefType['ArticleVersionEdge']>>
      })
    | (Omit<GQLCampaignConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['CampaignEdge']>>
      })
    | (Omit<GQLCircleConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['CircleEdge']>>
      })
    | (Omit<GQLCollectionConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['CollectionEdge']>>
      })
    | (Omit<GQLCommentConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['CommentEdge']>>
      })
    | (Omit<GQLDraftConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['DraftEdge']>>
      })
    | GQLFollowingActivityConnection
    | (Omit<GQLIcymiTopicConnection, 'edges'> & {
        edges: Array<RefType['IcymiTopicEdge']>
      })
    | (Omit<GQLInvitationConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['InvitationEdge']>>
      })
    | (Omit<GQLMemberConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['MemberEdge']>>
      })
    | (Omit<GQLNoticeConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['NoticeEdge']>>
      })
    | (Omit<GQLOAuthClientConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['OAuthClientEdge']>>
      })
    | (Omit<GQLReadHistoryConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['ReadHistoryEdge']>>
      })
    | GQLRecentSearchConnection
    | (Omit<GQLReportConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['ReportEdge']>>
      })
    | GQLResponseConnection
    | GQLSearchResultConnection
    | GQLSkippedListItemsConnection
    | (Omit<GQLTagConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['TagEdge']>>
      })
    | (Omit<GQLTopDonatorConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['TopDonatorEdge']>>
      })
    | (Omit<GQLTransactionConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['TransactionEdge']>>
      })
    | (Omit<GQLUserConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['UserEdge']>>
      })
    | (Omit<GQLWritingConnection, 'edges'> & {
        edges?: Maybe<Array<RefType['WritingEdge']>>
      })
  Node:
    | ArticleModel
    | ArticleVersionModel
    | CircleModel
    | CollectionModel
    | CommentModel
    | DraftModel
    | MattersChoiceTopicModel
    | MomentModel
    | ReportModel
    | TagModel
    | UserModel
    | CampaignModel
  Notice:
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
    | NoticeItemModel
  PinnableWork: ArticleModel | CollectionModel
}>

/** Mapping between all available schema types and the resolvers types */
export type GQLResolversTypes = ResolversObject<{
  AddArticlesTagsInput: GQLAddArticlesTagsInput
  AddCollectionsArticlesInput: GQLAddCollectionsArticlesInput
  AddCreditInput: GQLAddCreditInput
  AddCreditResult: ResolverTypeWrapper<
    Omit<GQLAddCreditResult, 'transaction'> & {
      transaction: GQLResolversTypes['Transaction']
    }
  >
  Announcement: ResolverTypeWrapper<GQLAnnouncement>
  AnnouncementType: GQLAnnouncementType
  AnnouncementsInput: GQLAnnouncementsInput
  ApplyCampaignInput: GQLApplyCampaignInput
  AppreciateArticleInput: GQLAppreciateArticleInput
  Appreciation: ResolverTypeWrapper<AppreciationModel>
  AppreciationConnection: ResolverTypeWrapper<
    Omit<GQLAppreciationConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['AppreciationEdge']>>
    }
  >
  AppreciationEdge: ResolverTypeWrapper<
    Omit<GQLAppreciationEdge, 'node'> & {
      node: GQLResolversTypes['Appreciation']
    }
  >
  AppreciationPurpose: GQLAppreciationPurpose
  Article: ResolverTypeWrapper<ArticleModel>
  ArticleAccess: ResolverTypeWrapper<ArticleModel>
  ArticleAccessType: GQLArticleAccessType
  ArticleArticleNotice: ResolverTypeWrapper<NoticeItemModel>
  ArticleArticleNoticeType: GQLArticleArticleNoticeType
  ArticleConnection: ResolverTypeWrapper<
    Omit<GQLArticleConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['ArticleEdge']>>
    }
  >
  ArticleContents: ResolverTypeWrapper<ArticleVersionModel>
  ArticleDonation: ResolverTypeWrapper<
    Omit<GQLArticleDonation, 'sender'> & {
      sender?: Maybe<GQLResolversTypes['User']>
    }
  >
  ArticleDonationConnection: ResolverTypeWrapper<
    Omit<GQLArticleDonationConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['ArticleDonationEdge']>>
    }
  >
  ArticleDonationEdge: ResolverTypeWrapper<
    Omit<GQLArticleDonationEdge, 'node'> & {
      node: GQLResolversTypes['ArticleDonation']
    }
  >
  ArticleEdge: ResolverTypeWrapper<
    Omit<GQLArticleEdge, 'node'> & { node: GQLResolversTypes['Article'] }
  >
  ArticleInput: GQLArticleInput
  ArticleLicenseType: GQLArticleLicenseType
  ArticleNotice: ResolverTypeWrapper<NoticeItemModel>
  ArticleNoticeType: GQLArticleNoticeType
  ArticleOSS: ResolverTypeWrapper<ArticleModel>
  ArticleRecommendationActivity: ResolverTypeWrapper<
    Omit<GQLArticleRecommendationActivity, 'nodes'> & {
      nodes?: Maybe<Array<GQLResolversTypes['Article']>>
    }
  >
  ArticleRecommendationActivitySource: GQLArticleRecommendationActivitySource
  ArticleState: GQLArticleState
  ArticleTranslation: ResolverTypeWrapper<GQLArticleTranslation>
  ArticleVersion: ResolverTypeWrapper<ArticleVersionModel>
  ArticleVersionEdge: ResolverTypeWrapper<
    Omit<GQLArticleVersionEdge, 'node'> & {
      node: GQLResolversTypes['ArticleVersion']
    }
  >
  ArticleVersionsConnection: ResolverTypeWrapper<
    Omit<GQLArticleVersionsConnection, 'edges'> & {
      edges: Array<Maybe<GQLResolversTypes['ArticleVersionEdge']>>
    }
  >
  ArticleVersionsInput: GQLArticleVersionsInput
  Asset: ResolverTypeWrapper<AssetModel>
  AssetType: GQLAssetType
  AuthResult: ResolverTypeWrapper<
    Omit<GQLAuthResult, 'user'> & { user?: Maybe<GQLResolversTypes['User']> }
  >
  AuthResultType: GQLAuthResultType
  AuthorsType: GQLAuthorsType
  Badge: ResolverTypeWrapper<GQLBadge>
  BadgeType: GQLBadgeType
  BadgedUsersInput: GQLBadgedUsersInput
  Balance: ResolverTypeWrapper<GQLBalance>
  BlockchainTransaction: ResolverTypeWrapper<GQLBlockchainTransaction>
  BlockedSearchKeyword: ResolverTypeWrapper<GQLBlockedSearchKeyword>
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>
  BoostTypes: GQLBoostTypes
  CacheControlScope: GQLCacheControlScope
  Campaign: ResolverTypeWrapper<CampaignModel>
  CampaignApplicationState: GQLCampaignApplicationState
  CampaignArticlesFilter: GQLCampaignArticlesFilter
  CampaignArticlesInput: GQLCampaignArticlesInput
  CampaignConnection: ResolverTypeWrapper<
    Omit<GQLCampaignConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['CampaignEdge']>>
    }
  >
  CampaignEdge: ResolverTypeWrapper<
    Omit<GQLCampaignEdge, 'node'> & { node: GQLResolversTypes['Campaign'] }
  >
  CampaignInput: GQLCampaignInput
  CampaignStage: ResolverTypeWrapper<CampaignStageModel>
  CampaignStageInput: GQLCampaignStageInput
  CampaignState: GQLCampaignState
  CampaignsInput: GQLCampaignsInput
  Chain: GQLChain
  ChangeEmailInput: GQLChangeEmailInput
  Circle: ResolverTypeWrapper<CircleModel>
  CircleAnalytics: ResolverTypeWrapper<CircleModel>
  CircleConnection: ResolverTypeWrapper<
    Omit<GQLCircleConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['CircleEdge']>>
    }
  >
  CircleContentAnalytics: ResolverTypeWrapper<CircleModel>
  CircleContentAnalyticsDatum: ResolverTypeWrapper<
    Omit<GQLCircleContentAnalyticsDatum, 'node'> & {
      node: GQLResolversTypes['Article']
    }
  >
  CircleEdge: ResolverTypeWrapper<
    Omit<GQLCircleEdge, 'node'> & { node: GQLResolversTypes['Circle'] }
  >
  CircleFollowerAnalytics: ResolverTypeWrapper<CircleModel>
  CircleIncomeAnalytics: ResolverTypeWrapper<CircleModel>
  CircleInput: GQLCircleInput
  CircleNotice: ResolverTypeWrapper<NoticeItemModel>
  CircleNoticeType: GQLCircleNoticeType
  CircleRecommendationActivity: ResolverTypeWrapper<
    Omit<GQLCircleRecommendationActivity, 'nodes'> & {
      nodes?: Maybe<Array<GQLResolversTypes['Circle']>>
    }
  >
  CircleRecommendationActivitySource: GQLCircleRecommendationActivitySource
  CircleState: GQLCircleState
  CircleSubscriberAnalytics: ResolverTypeWrapper<CircleModel>
  ClaimLogbooksInput: GQLClaimLogbooksInput
  ClaimLogbooksResult: ResolverTypeWrapper<GQLClaimLogbooksResult>
  ClearReadHistoryInput: GQLClearReadHistoryInput
  Collection: ResolverTypeWrapper<CollectionModel>
  CollectionArticlesInput: GQLCollectionArticlesInput
  CollectionConnection: ResolverTypeWrapper<
    Omit<GQLCollectionConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['CollectionEdge']>>
    }
  >
  CollectionEdge: ResolverTypeWrapper<
    Omit<GQLCollectionEdge, 'node'> & { node: GQLResolversTypes['Collection'] }
  >
  Comment: ResolverTypeWrapper<CommentModel>
  CommentCommentNotice: ResolverTypeWrapper<NoticeItemModel>
  CommentCommentNoticeType: GQLCommentCommentNoticeType
  CommentCommentsInput: GQLCommentCommentsInput
  CommentConnection: ResolverTypeWrapper<
    Omit<GQLCommentConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['CommentEdge']>>
    }
  >
  CommentEdge: ResolverTypeWrapper<
    Omit<GQLCommentEdge, 'node'> & { node: GQLResolversTypes['Comment'] }
  >
  CommentInput: GQLCommentInput
  CommentNotice: ResolverTypeWrapper<NoticeItemModel>
  CommentNoticeType: GQLCommentNoticeType
  CommentSort: GQLCommentSort
  CommentState: GQLCommentState
  CommentType: GQLCommentType
  CommentsFilter: GQLCommentsFilter
  CommentsInput: GQLCommentsInput
  ConfirmVerificationCodeInput: GQLConfirmVerificationCodeInput
  ConnectStripeAccountInput: GQLConnectStripeAccountInput
  ConnectStripeAccountResult: ResolverTypeWrapper<GQLConnectStripeAccountResult>
  Connection: ResolverTypeWrapper<
    GQLResolversInterfaceTypes<GQLResolversTypes>['Connection']
  >
  ConnectionArgs: GQLConnectionArgs
  CryptoWallet: ResolverTypeWrapper<WalletModel>
  CryptoWalletSignaturePurpose: GQLCryptoWalletSignaturePurpose
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>
  DatetimeRange: ResolverTypeWrapper<GQLDatetimeRange>
  DatetimeRangeInput: GQLDatetimeRangeInput
  DeleteAnnouncementsInput: GQLDeleteAnnouncementsInput
  DeleteArticlesTagsInput: GQLDeleteArticlesTagsInput
  DeleteCollectionArticlesInput: GQLDeleteCollectionArticlesInput
  DeleteCollectionsInput: GQLDeleteCollectionsInput
  DeleteCommentInput: GQLDeleteCommentInput
  DeleteDraftInput: GQLDeleteDraftInput
  DeleteMomentInput: GQLDeleteMomentInput
  DeleteTagsInput: GQLDeleteTagsInput
  DirectImageUploadInput: GQLDirectImageUploadInput
  Draft: ResolverTypeWrapper<DraftModel>
  DraftAccess: ResolverTypeWrapper<DraftModel>
  DraftConnection: ResolverTypeWrapper<
    Omit<GQLDraftConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['DraftEdge']>>
    }
  >
  DraftEdge: ResolverTypeWrapper<
    Omit<GQLDraftEdge, 'node'> & { node: GQLResolversTypes['Draft'] }
  >
  EditArticleInput: GQLEditArticleInput
  EmailLoginInput: GQLEmailLoginInput
  EntityType: GQLEntityType
  ExchangeRate: ResolverTypeWrapper<GQLExchangeRate>
  ExchangeRatesInput: GQLExchangeRatesInput
  Feature: ResolverTypeWrapper<GQLFeature>
  FeatureFlag: GQLFeatureFlag
  FeatureName: GQLFeatureName
  FeaturedCommentsInput: GQLFeaturedCommentsInput
  FeaturedTagsInput: GQLFeaturedTagsInput
  FilterInput: GQLFilterInput
  Float: ResolverTypeWrapper<Scalars['Float']['output']>
  Following: ResolverTypeWrapper<UserModel>
  FollowingActivity: ResolverTypeWrapper<
    GQLResolversUnionTypes<GQLResolversTypes>['FollowingActivity']
  >
  FollowingActivityConnection: ResolverTypeWrapper<GQLFollowingActivityConnection>
  FollowingActivityEdge: ResolverTypeWrapper<
    Omit<GQLFollowingActivityEdge, 'node'> & {
      node: GQLResolversTypes['FollowingActivity']
    }
  >
  FrequentSearchInput: GQLFrequentSearchInput
  GenerateSigningMessageInput: GQLGenerateSigningMessageInput
  GrantType: GQLGrantType
  ID: ResolverTypeWrapper<Scalars['ID']['output']>
  IcymiTopic: ResolverTypeWrapper<MattersChoiceTopicModel>
  IcymiTopicConnection: ResolverTypeWrapper<
    Omit<GQLIcymiTopicConnection, 'edges'> & {
      edges: Array<GQLResolversTypes['IcymiTopicEdge']>
    }
  >
  IcymiTopicEdge: ResolverTypeWrapper<
    Omit<GQLIcymiTopicEdge, 'node'> & { node: GQLResolversTypes['IcymiTopic'] }
  >
  IcymiTopicState: GQLIcymiTopicState
  Int: ResolverTypeWrapper<Scalars['Int']['output']>
  Invitation: ResolverTypeWrapper<CircleInvitationModel>
  InvitationConnection: ResolverTypeWrapper<
    Omit<GQLInvitationConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['InvitationEdge']>>
    }
  >
  InvitationEdge: ResolverTypeWrapper<
    Omit<GQLInvitationEdge, 'node'> & { node: GQLResolversTypes['Invitation'] }
  >
  InvitationState: GQLInvitationState
  InviteCircleInput: GQLInviteCircleInput
  InviteCircleInvitee: GQLInviteCircleInvitee
  Invitee: ResolverTypeWrapper<
    GQLResolversUnionTypes<GQLResolversTypes>['Invitee']
  >
  Invites: ResolverTypeWrapper<CircleModel>
  KeywordInput: GQLKeywordInput
  KeywordsInput: GQLKeywordsInput
  LikeMomentInput: GQLLikeMomentInput
  Liker: ResolverTypeWrapper<UserModel>
  LogRecordInput: GQLLogRecordInput
  LogRecordTypes: GQLLogRecordTypes
  Member: ResolverTypeWrapper<CircleMemberModel>
  MemberConnection: ResolverTypeWrapper<
    Omit<GQLMemberConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['MemberEdge']>>
    }
  >
  MemberEdge: ResolverTypeWrapper<
    Omit<GQLMemberEdge, 'node'> & { node: GQLResolversTypes['Member'] }
  >
  MergeTagsInput: GQLMergeTagsInput
  MigrationInput: GQLMigrationInput
  MigrationType: GQLMigrationType
  Moment: ResolverTypeWrapper<MomentModel>
  MomentInput: GQLMomentInput
  MomentNotice: ResolverTypeWrapper<NoticeItemModel>
  MomentNoticeType: GQLMomentNoticeType
  MomentState: GQLMomentState
  MonthlyDatum: ResolverTypeWrapper<GQLMonthlyDatum>
  Mutation: ResolverTypeWrapper<{}>
  NFTAsset: ResolverTypeWrapper<GQLNftAsset>
  Node: ResolverTypeWrapper<
    GQLResolversInterfaceTypes<GQLResolversTypes>['Node']
  >
  NodeInput: GQLNodeInput
  NodesInput: GQLNodesInput
  Notice: ResolverTypeWrapper<NoticeItemModel>
  NoticeConnection: ResolverTypeWrapper<
    Omit<GQLNoticeConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['NoticeEdge']>>
    }
  >
  NoticeEdge: ResolverTypeWrapper<
    Omit<GQLNoticeEdge, 'node'> & { node: GQLResolversTypes['Notice'] }
  >
  NotificationSetting: ResolverTypeWrapper<GQLNotificationSetting>
  NotificationSettingType: GQLNotificationSettingType
  OAuthClient: ResolverTypeWrapper<OAuthClientDBModel>
  OAuthClientConnection: ResolverTypeWrapper<
    Omit<GQLOAuthClientConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['OAuthClientEdge']>>
    }
  >
  OAuthClientEdge: ResolverTypeWrapper<
    Omit<GQLOAuthClientEdge, 'node'> & {
      node: GQLResolversTypes['OAuthClient']
    }
  >
  OAuthClientInput: GQLOAuthClientInput
  OSS: ResolverTypeWrapper<
    Omit<
      GQLOss,
      | 'articles'
      | 'badgedUsers'
      | 'comments'
      | 'icymiTopics'
      | 'oauthClients'
      | 'reports'
      | 'restrictedUsers'
      | 'seedingUsers'
      | 'tags'
      | 'users'
    > & {
      articles: GQLResolversTypes['ArticleConnection']
      badgedUsers: GQLResolversTypes['UserConnection']
      comments: GQLResolversTypes['CommentConnection']
      icymiTopics: GQLResolversTypes['IcymiTopicConnection']
      oauthClients: GQLResolversTypes['OAuthClientConnection']
      reports: GQLResolversTypes['ReportConnection']
      restrictedUsers: GQLResolversTypes['UserConnection']
      seedingUsers: GQLResolversTypes['UserConnection']
      tags: GQLResolversTypes['TagConnection']
      users: GQLResolversTypes['UserConnection']
    }
  >
  Oauth1CredentialInput: GQLOauth1CredentialInput
  Official: ResolverTypeWrapper<GQLOfficial>
  OfficialAnnouncementNotice: ResolverTypeWrapper<NoticeItemModel>
  PageInfo: ResolverTypeWrapper<GQLPageInfo>
  PayToInput: GQLPayToInput
  PayToResult: ResolverTypeWrapper<
    Omit<GQLPayToResult, 'transaction'> & {
      transaction: GQLResolversTypes['Transaction']
    }
  >
  PayoutInput: GQLPayoutInput
  Person: ResolverTypeWrapper<GQLPerson>
  PinCommentInput: GQLPinCommentInput
  PinnableWork: ResolverTypeWrapper<
    GQLResolversInterfaceTypes<GQLResolversTypes>['PinnableWork']
  >
  Price: ResolverTypeWrapper<CirclePriceModel>
  PriceState: GQLPriceState
  PublishArticleInput: GQLPublishArticleInput
  PublishState: GQLPublishState
  PutAnnouncementInput: GQLPutAnnouncementInput
  PutCircleArticlesInput: GQLPutCircleArticlesInput
  PutCircleArticlesType: GQLPutCircleArticlesType
  PutCircleInput: GQLPutCircleInput
  PutCollectionInput: GQLPutCollectionInput
  PutCommentInput: GQLPutCommentInput
  PutDraftInput: GQLPutDraftInput
  PutIcymiTopicInput: GQLPutIcymiTopicInput
  PutMomentInput: GQLPutMomentInput
  PutOAuthClientInput: GQLPutOAuthClientInput
  PutRemarkInput: GQLPutRemarkInput
  PutRestrictedUsersInput: GQLPutRestrictedUsersInput
  PutSkippedListItemInput: GQLPutSkippedListItemInput
  PutTagInput: GQLPutTagInput
  PutWritingChallengeInput: GQLPutWritingChallengeInput
  Query: ResolverTypeWrapper<{}>
  QuoteCurrency: GQLQuoteCurrency
  ReadArticleInput: GQLReadArticleInput
  ReadHistory: ResolverTypeWrapper<
    Omit<GQLReadHistory, 'article'> & { article: GQLResolversTypes['Article'] }
  >
  ReadHistoryConnection: ResolverTypeWrapper<
    Omit<GQLReadHistoryConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['ReadHistoryEdge']>>
    }
  >
  ReadHistoryEdge: ResolverTypeWrapper<
    Omit<GQLReadHistoryEdge, 'node'> & {
      node: GQLResolversTypes['ReadHistory']
    }
  >
  RecentSearchConnection: ResolverTypeWrapper<GQLRecentSearchConnection>
  RecentSearchEdge: ResolverTypeWrapper<GQLRecentSearchEdge>
  RecommendInput: GQLRecommendInput
  RecommendTypes: GQLRecommendTypes
  Recommendation: ResolverTypeWrapper<UserModel>
  RecommendationFollowingFilterInput: GQLRecommendationFollowingFilterInput
  RecommendationFollowingFilterType: GQLRecommendationFollowingFilterType
  RecommendationFollowingInput: GQLRecommendationFollowingInput
  RefreshIPNSFeedInput: GQLRefreshIpnsFeedInput
  RelatedDonationArticlesInput: GQLRelatedDonationArticlesInput
  RemarkTypes: GQLRemarkTypes
  RemoveSocialLoginInput: GQLRemoveSocialLoginInput
  RenameTagInput: GQLRenameTagInput
  ReorderCollectionArticlesInput: GQLReorderCollectionArticlesInput
  ReorderMoveInput: GQLReorderMoveInput
  Report: ResolverTypeWrapper<ReportModel>
  ReportConnection: ResolverTypeWrapper<
    Omit<GQLReportConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['ReportEdge']>>
    }
  >
  ReportEdge: ResolverTypeWrapper<
    Omit<GQLReportEdge, 'node'> & { node: GQLResolversTypes['Report'] }
  >
  ReportReason: GQLReportReason
  ResetLikerIdInput: GQLResetLikerIdInput
  ResetPasswordInput: GQLResetPasswordInput
  ResetPasswordType: GQLResetPasswordType
  ResetWalletInput: GQLResetWalletInput
  Response: ResolverTypeWrapper<
    GQLResolversUnionTypes<GQLResolversTypes>['Response']
  >
  ResponseConnection: ResolverTypeWrapper<GQLResponseConnection>
  ResponseEdge: ResolverTypeWrapper<
    Omit<GQLResponseEdge, 'node'> & { node: GQLResolversTypes['Response'] }
  >
  ResponseSort: GQLResponseSort
  ResponsesInput: GQLResponsesInput
  Role: GQLRole
  SearchAPIVersion: GQLSearchApiVersion
  SearchExclude: GQLSearchExclude
  SearchFilter: GQLSearchFilter
  SearchInput: GQLSearchInput
  SearchResultConnection: ResolverTypeWrapper<GQLSearchResultConnection>
  SearchResultEdge: ResolverTypeWrapper<GQLSearchResultEdge>
  SearchTypes: GQLSearchTypes
  SendVerificationCodeInput: GQLSendVerificationCodeInput
  SetBoostInput: GQLSetBoostInput
  SetCurrencyInput: GQLSetCurrencyInput
  SetEmailInput: GQLSetEmailInput
  SetFeatureInput: GQLSetFeatureInput
  SetPasswordInput: GQLSetPasswordInput
  SetUserNameInput: GQLSetUserNameInput
  SigningMessagePurpose: GQLSigningMessagePurpose
  SigningMessageResult: ResolverTypeWrapper<GQLSigningMessageResult>
  SingleFileUploadInput: GQLSingleFileUploadInput
  SkippedListItem: ResolverTypeWrapper<GQLSkippedListItem>
  SkippedListItemEdge: ResolverTypeWrapper<GQLSkippedListItemEdge>
  SkippedListItemType: GQLSkippedListItemType
  SkippedListItemsConnection: ResolverTypeWrapper<GQLSkippedListItemsConnection>
  SkippedListItemsInput: GQLSkippedListItemsInput
  SocialAccount: ResolverTypeWrapper<GQLSocialAccount>
  SocialAccountType: GQLSocialAccountType
  SocialLoginInput: GQLSocialLoginInput
  String: ResolverTypeWrapper<Scalars['String']['output']>
  StripeAccount: ResolverTypeWrapper<PayoutAccountModel>
  StripeAccountCountry: GQLStripeAccountCountry
  SubmitReportInput: GQLSubmitReportInput
  SubscribeCircleInput: GQLSubscribeCircleInput
  SubscribeCircleResult: ResolverTypeWrapper<
    Omit<GQLSubscribeCircleResult, 'circle'> & {
      circle: GQLResolversTypes['Circle']
    }
  >
  Tag: ResolverTypeWrapper<TagModel>
  TagArticlesInput: GQLTagArticlesInput
  TagArticlesSortBy: GQLTagArticlesSortBy
  TagConnection: ResolverTypeWrapper<
    Omit<GQLTagConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['TagEdge']>>
    }
  >
  TagEdge: ResolverTypeWrapper<
    Omit<GQLTagEdge, 'node'> & { node: GQLResolversTypes['Tag'] }
  >
  TagEditorsInput: GQLTagEditorsInput
  TagOSS: ResolverTypeWrapper<TagModel>
  TagSelectedInput: GQLTagSelectedInput
  TagsInput: GQLTagsInput
  TagsSort: GQLTagsSort
  ToggleCircleMemberInput: GQLToggleCircleMemberInput
  ToggleItemInput: GQLToggleItemInput
  ToggleRecommendInput: GQLToggleRecommendInput
  ToggleSeedingUsersInput: GQLToggleSeedingUsersInput
  ToggleUsersBadgeInput: GQLToggleUsersBadgeInput
  TopDonatorConnection: ResolverTypeWrapper<
    Omit<GQLTopDonatorConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['TopDonatorEdge']>>
    }
  >
  TopDonatorEdge: ResolverTypeWrapper<
    Omit<GQLTopDonatorEdge, 'node'> & { node: GQLResolversTypes['User'] }
  >
  TopDonatorFilter: GQLTopDonatorFilter
  TopDonatorInput: GQLTopDonatorInput
  Transaction: ResolverTypeWrapper<TransactionModel>
  TransactionConnection: ResolverTypeWrapper<
    Omit<GQLTransactionConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['TransactionEdge']>>
    }
  >
  TransactionCurrency: GQLTransactionCurrency
  TransactionEdge: ResolverTypeWrapper<
    Omit<GQLTransactionEdge, 'node'> & {
      node: GQLResolversTypes['Transaction']
    }
  >
  TransactionNotice: ResolverTypeWrapper<NoticeItemModel>
  TransactionNoticeType: GQLTransactionNoticeType
  TransactionPurpose: GQLTransactionPurpose
  TransactionState: GQLTransactionState
  TransactionTarget: ResolverTypeWrapper<
    GQLResolversUnionTypes<GQLResolversTypes>['TransactionTarget']
  >
  TransactionsArgs: GQLTransactionsArgs
  TransactionsFilter: GQLTransactionsFilter
  TransactionsReceivedByArgs: GQLTransactionsReceivedByArgs
  TranslatedAnnouncement: ResolverTypeWrapper<GQLTranslatedAnnouncement>
  TranslatedAnnouncementInput: GQLTranslatedAnnouncementInput
  TranslationArgs: GQLTranslationArgs
  TranslationInput: GQLTranslationInput
  UnbindLikerIdInput: GQLUnbindLikerIdInput
  UnlikeMomentInput: GQLUnlikeMomentInput
  UnpinCommentInput: GQLUnpinCommentInput
  UnsubscribeCircleInput: GQLUnsubscribeCircleInput
  UnvoteCommentInput: GQLUnvoteCommentInput
  UpdateArticleSensitiveInput: GQLUpdateArticleSensitiveInput
  UpdateArticleStateInput: GQLUpdateArticleStateInput
  UpdateArticlesTagsInput: GQLUpdateArticlesTagsInput
  UpdateCampaignApplicationStateInput: GQLUpdateCampaignApplicationStateInput
  UpdateCommentsStateInput: GQLUpdateCommentsStateInput
  UpdateNotificationSettingInput: GQLUpdateNotificationSettingInput
  UpdateTagSettingInput: GQLUpdateTagSettingInput
  UpdateTagSettingType: GQLUpdateTagSettingType
  UpdateUserExtraInput: GQLUpdateUserExtraInput
  UpdateUserInfoInput: GQLUpdateUserInfoInput
  UpdateUserRoleInput: GQLUpdateUserRoleInput
  UpdateUserStateInput: GQLUpdateUserStateInput
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>
  User: ResolverTypeWrapper<UserModel>
  UserActivity: ResolverTypeWrapper<UserModel>
  UserAddArticleTagActivity: ResolverTypeWrapper<
    Omit<GQLUserAddArticleTagActivity, 'actor' | 'node' | 'target'> & {
      actor: GQLResolversTypes['User']
      node: GQLResolversTypes['Article']
      target: GQLResolversTypes['Tag']
    }
  >
  UserAnalytics: ResolverTypeWrapper<UserModel>
  UserArticlesFilter: GQLUserArticlesFilter
  UserArticlesInput: GQLUserArticlesInput
  UserArticlesSort: GQLUserArticlesSort
  UserBroadcastCircleActivity: ResolverTypeWrapper<
    Omit<GQLUserBroadcastCircleActivity, 'actor' | 'node' | 'target'> & {
      actor: GQLResolversTypes['User']
      node: GQLResolversTypes['Comment']
      target: GQLResolversTypes['Circle']
    }
  >
  UserConnection: ResolverTypeWrapper<
    Omit<GQLUserConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['UserEdge']>>
    }
  >
  UserCreateCircleActivity: ResolverTypeWrapper<
    Omit<GQLUserCreateCircleActivity, 'actor' | 'node'> & {
      actor: GQLResolversTypes['User']
      node: GQLResolversTypes['Circle']
    }
  >
  UserEdge: ResolverTypeWrapper<
    Omit<GQLUserEdge, 'node'> & { node: GQLResolversTypes['User'] }
  >
  UserGroup: GQLUserGroup
  UserInfo: ResolverTypeWrapper<UserModel>
  UserInfoFields: GQLUserInfoFields
  UserInput: GQLUserInput
  UserLanguage: GQLUserLanguage
  UserLoginInput: GQLUserLoginInput
  UserNotice: ResolverTypeWrapper<NoticeItemModel>
  UserNoticeType: GQLUserNoticeType
  UserOSS: ResolverTypeWrapper<UserModel>
  UserPostMomentActivity: ResolverTypeWrapper<
    Omit<GQLUserPostMomentActivity, 'actor' | 'more' | 'node'> & {
      actor: GQLResolversTypes['User']
      more: Array<GQLResolversTypes['Moment']>
      node: GQLResolversTypes['Moment']
    }
  >
  UserPublishArticleActivity: ResolverTypeWrapper<
    Omit<GQLUserPublishArticleActivity, 'actor' | 'node'> & {
      actor: GQLResolversTypes['User']
      node: GQLResolversTypes['Article']
    }
  >
  UserRecommendationActivity: ResolverTypeWrapper<
    Omit<GQLUserRecommendationActivity, 'nodes'> & {
      nodes?: Maybe<Array<GQLResolversTypes['User']>>
    }
  >
  UserRecommendationActivitySource: GQLUserRecommendationActivitySource
  UserRegisterInput: GQLUserRegisterInput
  UserRestriction: ResolverTypeWrapper<GQLUserRestriction>
  UserRestrictionType: GQLUserRestrictionType
  UserRole: GQLUserRole
  UserSettings: ResolverTypeWrapper<UserModel>
  UserState: GQLUserState
  UserStatus: ResolverTypeWrapper<UserModel>
  VerificationCodeType: GQLVerificationCodeType
  VerifyEmailInput: GQLVerifyEmailInput
  Vote: GQLVote
  VoteCommentInput: GQLVoteCommentInput
  Wallet: ResolverTypeWrapper<UserModel>
  WalletLoginInput: GQLWalletLoginInput
  Writing: ResolverTypeWrapper<WritingModel>
  WritingChallenge: ResolverTypeWrapper<CampaignModel>
  WritingConnection: ResolverTypeWrapper<
    Omit<GQLWritingConnection, 'edges'> & {
      edges?: Maybe<Array<GQLResolversTypes['WritingEdge']>>
    }
  >
  WritingEdge: ResolverTypeWrapper<
    Omit<GQLWritingEdge, 'node'> & { node: GQLResolversTypes['Writing'] }
  >
  WritingInput: GQLWritingInput
}>

/** Mapping between all available schema types and the resolvers parents */
export type GQLResolversParentTypes = ResolversObject<{
  AddArticlesTagsInput: GQLAddArticlesTagsInput
  AddCollectionsArticlesInput: GQLAddCollectionsArticlesInput
  AddCreditInput: GQLAddCreditInput
  AddCreditResult: Omit<GQLAddCreditResult, 'transaction'> & {
    transaction: GQLResolversParentTypes['Transaction']
  }
  Announcement: GQLAnnouncement
  AnnouncementsInput: GQLAnnouncementsInput
  ApplyCampaignInput: GQLApplyCampaignInput
  AppreciateArticleInput: GQLAppreciateArticleInput
  Appreciation: AppreciationModel
  AppreciationConnection: Omit<GQLAppreciationConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['AppreciationEdge']>>
  }
  AppreciationEdge: Omit<GQLAppreciationEdge, 'node'> & {
    node: GQLResolversParentTypes['Appreciation']
  }
  Article: ArticleModel
  ArticleAccess: ArticleModel
  ArticleArticleNotice: NoticeItemModel
  ArticleConnection: Omit<GQLArticleConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['ArticleEdge']>>
  }
  ArticleContents: ArticleVersionModel
  ArticleDonation: Omit<GQLArticleDonation, 'sender'> & {
    sender?: Maybe<GQLResolversParentTypes['User']>
  }
  ArticleDonationConnection: Omit<GQLArticleDonationConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['ArticleDonationEdge']>>
  }
  ArticleDonationEdge: Omit<GQLArticleDonationEdge, 'node'> & {
    node: GQLResolversParentTypes['ArticleDonation']
  }
  ArticleEdge: Omit<GQLArticleEdge, 'node'> & {
    node: GQLResolversParentTypes['Article']
  }
  ArticleInput: GQLArticleInput
  ArticleNotice: NoticeItemModel
  ArticleOSS: ArticleModel
  ArticleRecommendationActivity: Omit<
    GQLArticleRecommendationActivity,
    'nodes'
  > & { nodes?: Maybe<Array<GQLResolversParentTypes['Article']>> }
  ArticleTranslation: GQLArticleTranslation
  ArticleVersion: ArticleVersionModel
  ArticleVersionEdge: Omit<GQLArticleVersionEdge, 'node'> & {
    node: GQLResolversParentTypes['ArticleVersion']
  }
  ArticleVersionsConnection: Omit<GQLArticleVersionsConnection, 'edges'> & {
    edges: Array<Maybe<GQLResolversParentTypes['ArticleVersionEdge']>>
  }
  ArticleVersionsInput: GQLArticleVersionsInput
  Asset: AssetModel
  AuthResult: Omit<GQLAuthResult, 'user'> & {
    user?: Maybe<GQLResolversParentTypes['User']>
  }
  Badge: GQLBadge
  BadgedUsersInput: GQLBadgedUsersInput
  Balance: GQLBalance
  BlockchainTransaction: GQLBlockchainTransaction
  BlockedSearchKeyword: GQLBlockedSearchKeyword
  Boolean: Scalars['Boolean']['output']
  Campaign: CampaignModel
  CampaignArticlesFilter: GQLCampaignArticlesFilter
  CampaignArticlesInput: GQLCampaignArticlesInput
  CampaignConnection: Omit<GQLCampaignConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['CampaignEdge']>>
  }
  CampaignEdge: Omit<GQLCampaignEdge, 'node'> & {
    node: GQLResolversParentTypes['Campaign']
  }
  CampaignInput: GQLCampaignInput
  CampaignStage: CampaignStageModel
  CampaignStageInput: GQLCampaignStageInput
  CampaignsInput: GQLCampaignsInput
  ChangeEmailInput: GQLChangeEmailInput
  Circle: CircleModel
  CircleAnalytics: CircleModel
  CircleConnection: Omit<GQLCircleConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['CircleEdge']>>
  }
  CircleContentAnalytics: CircleModel
  CircleContentAnalyticsDatum: Omit<GQLCircleContentAnalyticsDatum, 'node'> & {
    node: GQLResolversParentTypes['Article']
  }
  CircleEdge: Omit<GQLCircleEdge, 'node'> & {
    node: GQLResolversParentTypes['Circle']
  }
  CircleFollowerAnalytics: CircleModel
  CircleIncomeAnalytics: CircleModel
  CircleInput: GQLCircleInput
  CircleNotice: NoticeItemModel
  CircleRecommendationActivity: Omit<
    GQLCircleRecommendationActivity,
    'nodes'
  > & { nodes?: Maybe<Array<GQLResolversParentTypes['Circle']>> }
  CircleSubscriberAnalytics: CircleModel
  ClaimLogbooksInput: GQLClaimLogbooksInput
  ClaimLogbooksResult: GQLClaimLogbooksResult
  ClearReadHistoryInput: GQLClearReadHistoryInput
  Collection: CollectionModel
  CollectionArticlesInput: GQLCollectionArticlesInput
  CollectionConnection: Omit<GQLCollectionConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['CollectionEdge']>>
  }
  CollectionEdge: Omit<GQLCollectionEdge, 'node'> & {
    node: GQLResolversParentTypes['Collection']
  }
  Comment: CommentModel
  CommentCommentNotice: NoticeItemModel
  CommentCommentsInput: GQLCommentCommentsInput
  CommentConnection: Omit<GQLCommentConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['CommentEdge']>>
  }
  CommentEdge: Omit<GQLCommentEdge, 'node'> & {
    node: GQLResolversParentTypes['Comment']
  }
  CommentInput: GQLCommentInput
  CommentNotice: NoticeItemModel
  CommentsFilter: GQLCommentsFilter
  CommentsInput: GQLCommentsInput
  ConfirmVerificationCodeInput: GQLConfirmVerificationCodeInput
  ConnectStripeAccountInput: GQLConnectStripeAccountInput
  ConnectStripeAccountResult: GQLConnectStripeAccountResult
  Connection: GQLResolversInterfaceTypes<GQLResolversParentTypes>['Connection']
  ConnectionArgs: GQLConnectionArgs
  CryptoWallet: WalletModel
  DateTime: Scalars['DateTime']['output']
  DatetimeRange: GQLDatetimeRange
  DatetimeRangeInput: GQLDatetimeRangeInput
  DeleteAnnouncementsInput: GQLDeleteAnnouncementsInput
  DeleteArticlesTagsInput: GQLDeleteArticlesTagsInput
  DeleteCollectionArticlesInput: GQLDeleteCollectionArticlesInput
  DeleteCollectionsInput: GQLDeleteCollectionsInput
  DeleteCommentInput: GQLDeleteCommentInput
  DeleteDraftInput: GQLDeleteDraftInput
  DeleteMomentInput: GQLDeleteMomentInput
  DeleteTagsInput: GQLDeleteTagsInput
  DirectImageUploadInput: GQLDirectImageUploadInput
  Draft: DraftModel
  DraftAccess: DraftModel
  DraftConnection: Omit<GQLDraftConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['DraftEdge']>>
  }
  DraftEdge: Omit<GQLDraftEdge, 'node'> & {
    node: GQLResolversParentTypes['Draft']
  }
  EditArticleInput: GQLEditArticleInput
  EmailLoginInput: GQLEmailLoginInput
  ExchangeRate: GQLExchangeRate
  ExchangeRatesInput: GQLExchangeRatesInput
  Feature: GQLFeature
  FeaturedCommentsInput: GQLFeaturedCommentsInput
  FeaturedTagsInput: GQLFeaturedTagsInput
  FilterInput: GQLFilterInput
  Float: Scalars['Float']['output']
  Following: UserModel
  FollowingActivity: GQLResolversUnionTypes<GQLResolversParentTypes>['FollowingActivity']
  FollowingActivityConnection: GQLFollowingActivityConnection
  FollowingActivityEdge: Omit<GQLFollowingActivityEdge, 'node'> & {
    node: GQLResolversParentTypes['FollowingActivity']
  }
  FrequentSearchInput: GQLFrequentSearchInput
  GenerateSigningMessageInput: GQLGenerateSigningMessageInput
  ID: Scalars['ID']['output']
  IcymiTopic: MattersChoiceTopicModel
  IcymiTopicConnection: Omit<GQLIcymiTopicConnection, 'edges'> & {
    edges: Array<GQLResolversParentTypes['IcymiTopicEdge']>
  }
  IcymiTopicEdge: Omit<GQLIcymiTopicEdge, 'node'> & {
    node: GQLResolversParentTypes['IcymiTopic']
  }
  Int: Scalars['Int']['output']
  Invitation: CircleInvitationModel
  InvitationConnection: Omit<GQLInvitationConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['InvitationEdge']>>
  }
  InvitationEdge: Omit<GQLInvitationEdge, 'node'> & {
    node: GQLResolversParentTypes['Invitation']
  }
  InviteCircleInput: GQLInviteCircleInput
  InviteCircleInvitee: GQLInviteCircleInvitee
  Invitee: GQLResolversUnionTypes<GQLResolversParentTypes>['Invitee']
  Invites: CircleModel
  KeywordInput: GQLKeywordInput
  KeywordsInput: GQLKeywordsInput
  LikeMomentInput: GQLLikeMomentInput
  Liker: UserModel
  LogRecordInput: GQLLogRecordInput
  Member: CircleMemberModel
  MemberConnection: Omit<GQLMemberConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['MemberEdge']>>
  }
  MemberEdge: Omit<GQLMemberEdge, 'node'> & {
    node: GQLResolversParentTypes['Member']
  }
  MergeTagsInput: GQLMergeTagsInput
  MigrationInput: GQLMigrationInput
  Moment: MomentModel
  MomentInput: GQLMomentInput
  MomentNotice: NoticeItemModel
  MonthlyDatum: GQLMonthlyDatum
  Mutation: {}
  NFTAsset: GQLNftAsset
  Node: GQLResolversInterfaceTypes<GQLResolversParentTypes>['Node']
  NodeInput: GQLNodeInput
  NodesInput: GQLNodesInput
  Notice: NoticeItemModel
  NoticeConnection: Omit<GQLNoticeConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['NoticeEdge']>>
  }
  NoticeEdge: Omit<GQLNoticeEdge, 'node'> & {
    node: GQLResolversParentTypes['Notice']
  }
  NotificationSetting: GQLNotificationSetting
  OAuthClient: OAuthClientDBModel
  OAuthClientConnection: Omit<GQLOAuthClientConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['OAuthClientEdge']>>
  }
  OAuthClientEdge: Omit<GQLOAuthClientEdge, 'node'> & {
    node: GQLResolversParentTypes['OAuthClient']
  }
  OAuthClientInput: GQLOAuthClientInput
  OSS: Omit<
    GQLOss,
    | 'articles'
    | 'badgedUsers'
    | 'comments'
    | 'icymiTopics'
    | 'oauthClients'
    | 'reports'
    | 'restrictedUsers'
    | 'seedingUsers'
    | 'tags'
    | 'users'
  > & {
    articles: GQLResolversParentTypes['ArticleConnection']
    badgedUsers: GQLResolversParentTypes['UserConnection']
    comments: GQLResolversParentTypes['CommentConnection']
    icymiTopics: GQLResolversParentTypes['IcymiTopicConnection']
    oauthClients: GQLResolversParentTypes['OAuthClientConnection']
    reports: GQLResolversParentTypes['ReportConnection']
    restrictedUsers: GQLResolversParentTypes['UserConnection']
    seedingUsers: GQLResolversParentTypes['UserConnection']
    tags: GQLResolversParentTypes['TagConnection']
    users: GQLResolversParentTypes['UserConnection']
  }
  Oauth1CredentialInput: GQLOauth1CredentialInput
  Official: GQLOfficial
  OfficialAnnouncementNotice: NoticeItemModel
  PageInfo: GQLPageInfo
  PayToInput: GQLPayToInput
  PayToResult: Omit<GQLPayToResult, 'transaction'> & {
    transaction: GQLResolversParentTypes['Transaction']
  }
  PayoutInput: GQLPayoutInput
  Person: GQLPerson
  PinCommentInput: GQLPinCommentInput
  PinnableWork: GQLResolversInterfaceTypes<GQLResolversParentTypes>['PinnableWork']
  Price: CirclePriceModel
  PublishArticleInput: GQLPublishArticleInput
  PutAnnouncementInput: GQLPutAnnouncementInput
  PutCircleArticlesInput: GQLPutCircleArticlesInput
  PutCircleInput: GQLPutCircleInput
  PutCollectionInput: GQLPutCollectionInput
  PutCommentInput: GQLPutCommentInput
  PutDraftInput: GQLPutDraftInput
  PutIcymiTopicInput: GQLPutIcymiTopicInput
  PutMomentInput: GQLPutMomentInput
  PutOAuthClientInput: GQLPutOAuthClientInput
  PutRemarkInput: GQLPutRemarkInput
  PutRestrictedUsersInput: GQLPutRestrictedUsersInput
  PutSkippedListItemInput: GQLPutSkippedListItemInput
  PutTagInput: GQLPutTagInput
  PutWritingChallengeInput: GQLPutWritingChallengeInput
  Query: {}
  ReadArticleInput: GQLReadArticleInput
  ReadHistory: Omit<GQLReadHistory, 'article'> & {
    article: GQLResolversParentTypes['Article']
  }
  ReadHistoryConnection: Omit<GQLReadHistoryConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['ReadHistoryEdge']>>
  }
  ReadHistoryEdge: Omit<GQLReadHistoryEdge, 'node'> & {
    node: GQLResolversParentTypes['ReadHistory']
  }
  RecentSearchConnection: GQLRecentSearchConnection
  RecentSearchEdge: GQLRecentSearchEdge
  RecommendInput: GQLRecommendInput
  Recommendation: UserModel
  RecommendationFollowingFilterInput: GQLRecommendationFollowingFilterInput
  RecommendationFollowingInput: GQLRecommendationFollowingInput
  RefreshIPNSFeedInput: GQLRefreshIpnsFeedInput
  RelatedDonationArticlesInput: GQLRelatedDonationArticlesInput
  RemoveSocialLoginInput: GQLRemoveSocialLoginInput
  RenameTagInput: GQLRenameTagInput
  ReorderCollectionArticlesInput: GQLReorderCollectionArticlesInput
  ReorderMoveInput: GQLReorderMoveInput
  Report: ReportModel
  ReportConnection: Omit<GQLReportConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['ReportEdge']>>
  }
  ReportEdge: Omit<GQLReportEdge, 'node'> & {
    node: GQLResolversParentTypes['Report']
  }
  ResetLikerIdInput: GQLResetLikerIdInput
  ResetPasswordInput: GQLResetPasswordInput
  ResetWalletInput: GQLResetWalletInput
  Response: GQLResolversUnionTypes<GQLResolversParentTypes>['Response']
  ResponseConnection: GQLResponseConnection
  ResponseEdge: Omit<GQLResponseEdge, 'node'> & {
    node: GQLResolversParentTypes['Response']
  }
  ResponsesInput: GQLResponsesInput
  SearchFilter: GQLSearchFilter
  SearchInput: GQLSearchInput
  SearchResultConnection: GQLSearchResultConnection
  SearchResultEdge: GQLSearchResultEdge
  SendVerificationCodeInput: GQLSendVerificationCodeInput
  SetBoostInput: GQLSetBoostInput
  SetCurrencyInput: GQLSetCurrencyInput
  SetEmailInput: GQLSetEmailInput
  SetFeatureInput: GQLSetFeatureInput
  SetPasswordInput: GQLSetPasswordInput
  SetUserNameInput: GQLSetUserNameInput
  SigningMessageResult: GQLSigningMessageResult
  SingleFileUploadInput: GQLSingleFileUploadInput
  SkippedListItem: GQLSkippedListItem
  SkippedListItemEdge: GQLSkippedListItemEdge
  SkippedListItemsConnection: GQLSkippedListItemsConnection
  SkippedListItemsInput: GQLSkippedListItemsInput
  SocialAccount: GQLSocialAccount
  SocialLoginInput: GQLSocialLoginInput
  String: Scalars['String']['output']
  StripeAccount: PayoutAccountModel
  SubmitReportInput: GQLSubmitReportInput
  SubscribeCircleInput: GQLSubscribeCircleInput
  SubscribeCircleResult: Omit<GQLSubscribeCircleResult, 'circle'> & {
    circle: GQLResolversParentTypes['Circle']
  }
  Tag: TagModel
  TagArticlesInput: GQLTagArticlesInput
  TagConnection: Omit<GQLTagConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['TagEdge']>>
  }
  TagEdge: Omit<GQLTagEdge, 'node'> & { node: GQLResolversParentTypes['Tag'] }
  TagEditorsInput: GQLTagEditorsInput
  TagOSS: TagModel
  TagSelectedInput: GQLTagSelectedInput
  TagsInput: GQLTagsInput
  ToggleCircleMemberInput: GQLToggleCircleMemberInput
  ToggleItemInput: GQLToggleItemInput
  ToggleRecommendInput: GQLToggleRecommendInput
  ToggleSeedingUsersInput: GQLToggleSeedingUsersInput
  ToggleUsersBadgeInput: GQLToggleUsersBadgeInput
  TopDonatorConnection: Omit<GQLTopDonatorConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['TopDonatorEdge']>>
  }
  TopDonatorEdge: Omit<GQLTopDonatorEdge, 'node'> & {
    node: GQLResolversParentTypes['User']
  }
  TopDonatorFilter: GQLTopDonatorFilter
  TopDonatorInput: GQLTopDonatorInput
  Transaction: TransactionModel
  TransactionConnection: Omit<GQLTransactionConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['TransactionEdge']>>
  }
  TransactionEdge: Omit<GQLTransactionEdge, 'node'> & {
    node: GQLResolversParentTypes['Transaction']
  }
  TransactionNotice: NoticeItemModel
  TransactionTarget: GQLResolversUnionTypes<GQLResolversParentTypes>['TransactionTarget']
  TransactionsArgs: GQLTransactionsArgs
  TransactionsFilter: GQLTransactionsFilter
  TransactionsReceivedByArgs: GQLTransactionsReceivedByArgs
  TranslatedAnnouncement: GQLTranslatedAnnouncement
  TranslatedAnnouncementInput: GQLTranslatedAnnouncementInput
  TranslationArgs: GQLTranslationArgs
  TranslationInput: GQLTranslationInput
  UnbindLikerIdInput: GQLUnbindLikerIdInput
  UnlikeMomentInput: GQLUnlikeMomentInput
  UnpinCommentInput: GQLUnpinCommentInput
  UnsubscribeCircleInput: GQLUnsubscribeCircleInput
  UnvoteCommentInput: GQLUnvoteCommentInput
  UpdateArticleSensitiveInput: GQLUpdateArticleSensitiveInput
  UpdateArticleStateInput: GQLUpdateArticleStateInput
  UpdateArticlesTagsInput: GQLUpdateArticlesTagsInput
  UpdateCampaignApplicationStateInput: GQLUpdateCampaignApplicationStateInput
  UpdateCommentsStateInput: GQLUpdateCommentsStateInput
  UpdateNotificationSettingInput: GQLUpdateNotificationSettingInput
  UpdateTagSettingInput: GQLUpdateTagSettingInput
  UpdateUserExtraInput: GQLUpdateUserExtraInput
  UpdateUserInfoInput: GQLUpdateUserInfoInput
  UpdateUserRoleInput: GQLUpdateUserRoleInput
  UpdateUserStateInput: GQLUpdateUserStateInput
  Upload: Scalars['Upload']['output']
  User: UserModel
  UserActivity: UserModel
  UserAddArticleTagActivity: Omit<
    GQLUserAddArticleTagActivity,
    'actor' | 'node' | 'target'
  > & {
    actor: GQLResolversParentTypes['User']
    node: GQLResolversParentTypes['Article']
    target: GQLResolversParentTypes['Tag']
  }
  UserAnalytics: UserModel
  UserArticlesFilter: GQLUserArticlesFilter
  UserArticlesInput: GQLUserArticlesInput
  UserBroadcastCircleActivity: Omit<
    GQLUserBroadcastCircleActivity,
    'actor' | 'node' | 'target'
  > & {
    actor: GQLResolversParentTypes['User']
    node: GQLResolversParentTypes['Comment']
    target: GQLResolversParentTypes['Circle']
  }
  UserConnection: Omit<GQLUserConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['UserEdge']>>
  }
  UserCreateCircleActivity: Omit<
    GQLUserCreateCircleActivity,
    'actor' | 'node'
  > & {
    actor: GQLResolversParentTypes['User']
    node: GQLResolversParentTypes['Circle']
  }
  UserEdge: Omit<GQLUserEdge, 'node'> & {
    node: GQLResolversParentTypes['User']
  }
  UserInfo: UserModel
  UserInput: GQLUserInput
  UserLoginInput: GQLUserLoginInput
  UserNotice: NoticeItemModel
  UserOSS: UserModel
  UserPostMomentActivity: Omit<
    GQLUserPostMomentActivity,
    'actor' | 'more' | 'node'
  > & {
    actor: GQLResolversParentTypes['User']
    more: Array<GQLResolversParentTypes['Moment']>
    node: GQLResolversParentTypes['Moment']
  }
  UserPublishArticleActivity: Omit<
    GQLUserPublishArticleActivity,
    'actor' | 'node'
  > & {
    actor: GQLResolversParentTypes['User']
    node: GQLResolversParentTypes['Article']
  }
  UserRecommendationActivity: Omit<GQLUserRecommendationActivity, 'nodes'> & {
    nodes?: Maybe<Array<GQLResolversParentTypes['User']>>
  }
  UserRegisterInput: GQLUserRegisterInput
  UserRestriction: GQLUserRestriction
  UserSettings: UserModel
  UserStatus: UserModel
  VerifyEmailInput: GQLVerifyEmailInput
  VoteCommentInput: GQLVoteCommentInput
  Wallet: UserModel
  WalletLoginInput: GQLWalletLoginInput
  Writing: WritingModel
  WritingChallenge: CampaignModel
  WritingConnection: Omit<GQLWritingConnection, 'edges'> & {
    edges?: Maybe<Array<GQLResolversParentTypes['WritingEdge']>>
  }
  WritingEdge: Omit<GQLWritingEdge, 'node'> & {
    node: GQLResolversParentTypes['Writing']
  }
  WritingInput: GQLWritingInput
}>

export type GQLAuthDirectiveArgs = {
  group?: Maybe<Scalars['String']['input']>
  mode: Scalars['String']['input']
}

export type GQLAuthDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLAuthDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLCacheControlDirectiveArgs = {
  inheritMaxAge?: Maybe<Scalars['Boolean']['input']>
  maxAge?: Maybe<Scalars['Int']['input']>
  scope?: Maybe<GQLCacheControlScope>
}

export type GQLCacheControlDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLCacheControlDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLComplexityDirectiveArgs = {
  multipliers?: Maybe<Array<Scalars['String']['input']>>
  value: Scalars['Int']['input']
}

export type GQLComplexityDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLComplexityDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLConstraintDirectiveArgs = {
  contains?: Maybe<Scalars['String']['input']>
  endsWith?: Maybe<Scalars['String']['input']>
  exclusiveMax?: Maybe<Scalars['Float']['input']>
  exclusiveMin?: Maybe<Scalars['Float']['input']>
  format?: Maybe<Scalars['String']['input']>
  max?: Maybe<Scalars['Float']['input']>
  maxItems?: Maybe<Scalars['Int']['input']>
  maxLength?: Maybe<Scalars['Int']['input']>
  min?: Maybe<Scalars['Float']['input']>
  minItems?: Maybe<Scalars['Int']['input']>
  minLength?: Maybe<Scalars['Int']['input']>
  multipleOf?: Maybe<Scalars['Float']['input']>
  notContains?: Maybe<Scalars['String']['input']>
  pattern?: Maybe<Scalars['String']['input']>
  startsWith?: Maybe<Scalars['String']['input']>
  uniqueTypeName?: Maybe<Scalars['String']['input']>
}

export type GQLConstraintDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLConstraintDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLLogCacheDirectiveArgs = {
  identifier?: Maybe<Scalars['String']['input']>
  type: Scalars['String']['input']
}

export type GQLLogCacheDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLLogCacheDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLObjectCacheDirectiveArgs = {
  maxAge?: Maybe<Scalars['Int']['input']>
}

export type GQLObjectCacheDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLObjectCacheDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLPrivateCacheDirectiveArgs = {
  strict?: Scalars['Boolean']['input']
}

export type GQLPrivateCacheDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLPrivateCacheDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLPurgeCacheDirectiveArgs = {
  identifier?: Maybe<Scalars['String']['input']>
  type: Scalars['String']['input']
}

export type GQLPurgeCacheDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLPurgeCacheDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLRateLimitDirectiveArgs = {
  limit: Scalars['Int']['input']
  period: Scalars['Int']['input']
}

export type GQLRateLimitDirectiveResolver<
  Result,
  Parent,
  ContextType = Context,
  Args = GQLRateLimitDirectiveArgs
> = DirectiveResolverFn<Result, Parent, ContextType, Args>

export type GQLAddCreditResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['AddCreditResult'] = GQLResolversParentTypes['AddCreditResult']
> = ResolversObject<{
  client_secret?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  transaction?: Resolver<
    GQLResolversTypes['Transaction'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLAnnouncementResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Announcement'] = GQLResolversParentTypes['Announcement']
> = ResolversObject<{
  content?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  expiredAt?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  link?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  order?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  title?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  translations?: Resolver<
    Maybe<Array<GQLResolversTypes['TranslatedAnnouncement']>>,
    ParentType,
    ContextType
  >
  type?: Resolver<
    GQLResolversTypes['AnnouncementType'],
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  visible?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLAppreciationResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Appreciation'] = GQLResolversParentTypes['Appreciation']
> = ResolversObject<{
  amount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  content?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  purpose?: Resolver<
    GQLResolversTypes['AppreciationPurpose'],
    ParentType,
    ContextType
  >
  recipient?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  sender?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  target?: Resolver<
    Maybe<GQLResolversTypes['Article']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLAppreciationConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['AppreciationConnection'] = GQLResolversParentTypes['AppreciationConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['AppreciationEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLAppreciationEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['AppreciationEdge'] = GQLResolversParentTypes['AppreciationEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Appreciation'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Article'] = GQLResolversParentTypes['Article']
> = ResolversObject<{
  access?: Resolver<GQLResolversTypes['ArticleAccess'], ParentType, ContextType>
  appreciateLeft?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  appreciateLimit?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  appreciationsReceived?: Resolver<
    GQLResolversTypes['AppreciationConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleAppreciationsReceivedArgs, 'input'>
  >
  appreciationsReceivedTotal?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  assets?: Resolver<Array<GQLResolversTypes['Asset']>, ParentType, ContextType>
  author?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  availableTranslations?: Resolver<
    Maybe<Array<GQLResolversTypes['UserLanguage']>>,
    ParentType,
    ContextType
  >
  canComment?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  canSuperLike?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  collectedBy?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleCollectedByArgs, 'input'>
  >
  collection?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleCollectionArgs, 'input'>
  >
  commentCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  comments?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleCommentsArgs, 'input'>
  >
  content?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  contents?: Resolver<
    GQLResolversTypes['ArticleContents'],
    ParentType,
    ContextType
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  dataHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  donated?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  donationCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  donations?: Resolver<
    GQLResolversTypes['ArticleDonationConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleDonationsArgs, 'input'>
  >
  drafts?: Resolver<
    Maybe<Array<GQLResolversTypes['Draft']>>,
    ParentType,
    ContextType
  >
  featuredComments?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleFeaturedCommentsArgs, 'input'>
  >
  hasAppreciate?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  iscnId?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  language?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  license?: Resolver<
    GQLResolversTypes['ArticleLicenseType'],
    ParentType,
    ContextType
  >
  mediaHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  newestPublishedDraft?: Resolver<
    GQLResolversTypes['Draft'],
    ParentType,
    ContextType
  >
  newestUnpublishedDraft?: Resolver<
    Maybe<GQLResolversTypes['Draft']>,
    ParentType,
    ContextType
  >
  oss?: Resolver<GQLResolversTypes['ArticleOSS'], ParentType, ContextType>
  pinCommentLeft?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  pinCommentLimit?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  pinned?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  pinnedComments?: Resolver<
    Maybe<Array<GQLResolversTypes['Comment']>>,
    ParentType,
    ContextType
  >
  readTime?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  readerCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  relatedArticles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleRelatedArticlesArgs, 'input'>
  >
  relatedDonationArticles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleRelatedDonationArticlesArgs, 'input'>
  >
  remark?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  replyToDonator?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  requestForDonation?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  responseCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  responses?: Resolver<
    GQLResolversTypes['ResponseConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleResponsesArgs, 'input'>
  >
  revisedAt?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  revisionCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  sensitiveByAdmin?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  sensitiveByAuthor?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  shortHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  slug?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  state?: Resolver<GQLResolversTypes['ArticleState'], ParentType, ContextType>
  sticky?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  subscribed?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  subscribers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleSubscribersArgs, 'input'>
  >
  summary?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  summaryCustomized?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  tags?: Resolver<
    Maybe<Array<GQLResolversTypes['Tag']>>,
    ParentType,
    ContextType
  >
  title?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  topicScore?: Resolver<
    Maybe<GQLResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  transactionsReceivedBy?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleTransactionsReceivedByArgs, 'input'>
  >
  translation?: Resolver<
    Maybe<GQLResolversTypes['ArticleTranslation']>,
    ParentType,
    ContextType,
    Partial<GQLArticleTranslationArgs>
  >
  versions?: Resolver<
    GQLResolversTypes['ArticleVersionsConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLArticleVersionsArgs, 'input'>
  >
  wordCount?: Resolver<Maybe<GQLResolversTypes['Int']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleAccessResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleAccess'] = GQLResolversParentTypes['ArticleAccess']
> = ResolversObject<{
  circle?: Resolver<Maybe<GQLResolversTypes['Circle']>, ParentType, ContextType>
  secret?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['ArticleAccessType'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleArticleNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleArticleNotice'] = GQLResolversParentTypes['ArticleArticleNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  article?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['ArticleArticleNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleConnection'] = GQLResolversParentTypes['ArticleConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['ArticleEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleContentsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleContents'] = GQLResolversParentTypes['ArticleContents']
> = ResolversObject<{
  html?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  markdown?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleDonationResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleDonation'] = GQLResolversParentTypes['ArticleDonation']
> = ResolversObject<{
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  sender?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleDonationConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleDonationConnection'] = GQLResolversParentTypes['ArticleDonationConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['ArticleDonationEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleDonationEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleDonationEdge'] = GQLResolversParentTypes['ArticleDonationEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['ArticleDonation'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleEdge'] = GQLResolversParentTypes['ArticleEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleNotice'] = GQLResolversParentTypes['ArticleNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['ArticleNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleOssResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleOSS'] = GQLResolversParentTypes['ArticleOSS']
> = ResolversObject<{
  boost?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  inRecommendHottest?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inRecommendIcymi?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inRecommendNewest?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inSearch?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  score?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleRecommendationActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleRecommendationActivity'] = GQLResolversParentTypes['ArticleRecommendationActivity']
> = ResolversObject<{
  nodes?: Resolver<
    Maybe<Array<GQLResolversTypes['Article']>>,
    ParentType,
    ContextType
  >
  source?: Resolver<
    Maybe<GQLResolversTypes['ArticleRecommendationActivitySource']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleTranslationResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleTranslation'] = GQLResolversParentTypes['ArticleTranslation']
> = ResolversObject<{
  content?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  language?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  summary?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  title?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleVersionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleVersion'] = GQLResolversParentTypes['ArticleVersion']
> = ResolversObject<{
  contents?: Resolver<
    GQLResolversTypes['ArticleContents'],
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  dataHash?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  mediaHash?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  summary?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  title?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  translation?: Resolver<
    Maybe<GQLResolversTypes['ArticleTranslation']>,
    ParentType,
    ContextType,
    Partial<GQLArticleVersionTranslationArgs>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleVersionEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleVersionEdge'] = GQLResolversParentTypes['ArticleVersionEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['ArticleVersion'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLArticleVersionsConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ArticleVersionsConnection'] = GQLResolversParentTypes['ArticleVersionsConnection']
> = ResolversObject<{
  edges?: Resolver<
    Array<Maybe<GQLResolversTypes['ArticleVersionEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLAssetResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Asset'] = GQLResolversParentTypes['Asset']
> = ResolversObject<{
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  draft?: Resolver<Maybe<GQLResolversTypes['Boolean']>, ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  path?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  type?: Resolver<GQLResolversTypes['AssetType'], ParentType, ContextType>
  uploadURL?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLAuthResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['AuthResult'] = GQLResolversParentTypes['AuthResult']
> = ResolversObject<{
  auth?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  token?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  type?: Resolver<GQLResolversTypes['AuthResultType'], ParentType, ContextType>
  user?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLBadgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Badge'] = GQLResolversParentTypes['Badge']
> = ResolversObject<{
  type?: Resolver<GQLResolversTypes['BadgeType'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLBalanceResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Balance'] = GQLResolversParentTypes['Balance']
> = ResolversObject<{
  HKD?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLBlockchainTransactionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['BlockchainTransaction'] = GQLResolversParentTypes['BlockchainTransaction']
> = ResolversObject<{
  chain?: Resolver<GQLResolversTypes['Chain'], ParentType, ContextType>
  txHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLBlockedSearchKeywordResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['BlockedSearchKeyword'] = GQLResolversParentTypes['BlockedSearchKeyword']
> = ResolversObject<{
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  searchKey?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCampaignResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Campaign'] = GQLResolversParentTypes['Campaign']
> = ResolversObject<{
  __resolveType: TypeResolveFn<'WritingChallenge', ParentType, ContextType>
}>

export type GQLCampaignConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CampaignConnection'] = GQLResolversParentTypes['CampaignConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['CampaignEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCampaignEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CampaignEdge'] = GQLResolversParentTypes['CampaignEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Campaign'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCampaignStageResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CampaignStage'] = GQLResolversParentTypes['CampaignStage']
> = ResolversObject<{
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  period?: Resolver<
    Maybe<GQLResolversTypes['DatetimeRange']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Circle'] = GQLResolversParentTypes['Circle']
> = ResolversObject<{
  analytics?: Resolver<
    GQLResolversTypes['CircleAnalytics'],
    ParentType,
    ContextType
  >
  avatar?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  broadcast?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCircleBroadcastArgs, 'input'>
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  discussion?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCircleDiscussionArgs, 'input'>
  >
  discussionCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  discussionThreadCount?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  displayName?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  followers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCircleFollowersArgs, 'input'>
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  invitedBy?: Resolver<
    Maybe<GQLResolversTypes['Invitation']>,
    ParentType,
    ContextType
  >
  invites?: Resolver<GQLResolversTypes['Invites'], ParentType, ContextType>
  isFollower?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  isMember?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  members?: Resolver<
    GQLResolversTypes['MemberConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCircleMembersArgs, 'input'>
  >
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  owner?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  pinnedBroadcast?: Resolver<
    Maybe<Array<GQLResolversTypes['Comment']>>,
    ParentType,
    ContextType
  >
  prices?: Resolver<
    Maybe<Array<GQLResolversTypes['Price']>>,
    ParentType,
    ContextType
  >
  state?: Resolver<GQLResolversTypes['CircleState'], ParentType, ContextType>
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  works?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCircleWorksArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleAnalyticsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleAnalytics'] = GQLResolversParentTypes['CircleAnalytics']
> = ResolversObject<{
  content?: Resolver<
    GQLResolversTypes['CircleContentAnalytics'],
    ParentType,
    ContextType
  >
  follower?: Resolver<
    GQLResolversTypes['CircleFollowerAnalytics'],
    ParentType,
    ContextType
  >
  income?: Resolver<
    GQLResolversTypes['CircleIncomeAnalytics'],
    ParentType,
    ContextType
  >
  subscriber?: Resolver<
    GQLResolversTypes['CircleSubscriberAnalytics'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleConnection'] = GQLResolversParentTypes['CircleConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['CircleEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleContentAnalyticsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleContentAnalytics'] = GQLResolversParentTypes['CircleContentAnalytics']
> = ResolversObject<{
  paywall?: Resolver<
    Maybe<Array<GQLResolversTypes['CircleContentAnalyticsDatum']>>,
    ParentType,
    ContextType
  >
  public?: Resolver<
    Maybe<Array<GQLResolversTypes['CircleContentAnalyticsDatum']>>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleContentAnalyticsDatumResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleContentAnalyticsDatum'] = GQLResolversParentTypes['CircleContentAnalyticsDatum']
> = ResolversObject<{
  node?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  readCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleEdge'] = GQLResolversParentTypes['CircleEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleFollowerAnalyticsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleFollowerAnalytics'] = GQLResolversParentTypes['CircleFollowerAnalytics']
> = ResolversObject<{
  current?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  followerPercentage?: Resolver<
    GQLResolversTypes['Float'],
    ParentType,
    ContextType
  >
  history?: Resolver<
    Array<GQLResolversTypes['MonthlyDatum']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleIncomeAnalyticsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleIncomeAnalytics'] = GQLResolversParentTypes['CircleIncomeAnalytics']
> = ResolversObject<{
  history?: Resolver<
    Array<GQLResolversTypes['MonthlyDatum']>,
    ParentType,
    ContextType
  >
  nextMonth?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  thisMonth?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  total?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleNotice'] = GQLResolversParentTypes['CircleNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  comments?: Resolver<
    Maybe<Array<GQLResolversTypes['Comment']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  mentions?: Resolver<
    Maybe<Array<GQLResolversTypes['Comment']>>,
    ParentType,
    ContextType
  >
  replies?: Resolver<
    Maybe<Array<GQLResolversTypes['Comment']>>,
    ParentType,
    ContextType
  >
  target?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['CircleNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleRecommendationActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleRecommendationActivity'] = GQLResolversParentTypes['CircleRecommendationActivity']
> = ResolversObject<{
  nodes?: Resolver<
    Maybe<Array<GQLResolversTypes['Circle']>>,
    ParentType,
    ContextType
  >
  source?: Resolver<
    Maybe<GQLResolversTypes['CircleRecommendationActivitySource']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCircleSubscriberAnalyticsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CircleSubscriberAnalytics'] = GQLResolversParentTypes['CircleSubscriberAnalytics']
> = ResolversObject<{
  currentInvitee?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  currentSubscriber?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  inviteeHistory?: Resolver<
    Array<GQLResolversTypes['MonthlyDatum']>,
    ParentType,
    ContextType
  >
  subscriberHistory?: Resolver<
    Array<GQLResolversTypes['MonthlyDatum']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLClaimLogbooksResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ClaimLogbooksResult'] = GQLResolversParentTypes['ClaimLogbooksResult']
> = ResolversObject<{
  ids?: Resolver<Maybe<Array<GQLResolversTypes['ID']>>, ParentType, ContextType>
  txHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCollectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Collection'] = GQLResolversParentTypes['Collection']
> = ResolversObject<{
  articles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCollectionArticlesArgs, 'input'>
  >
  author?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  contains?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<GQLCollectionContainsArgs, 'input'>
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  pinned?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  title?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCollectionConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CollectionConnection'] = GQLResolversParentTypes['CollectionConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['CollectionEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCollectionEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CollectionEdge'] = GQLResolversParentTypes['CollectionEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Collection'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCommentResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Comment'] = GQLResolversParentTypes['Comment']
> = ResolversObject<{
  author?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  comments?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLCommentCommentsArgs, 'input'>
  >
  content?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  downvotes?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  fromDonator?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  myVote?: Resolver<Maybe<GQLResolversTypes['Vote']>, ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Node'], ParentType, ContextType>
  parentComment?: Resolver<
    Maybe<GQLResolversTypes['Comment']>,
    ParentType,
    ContextType
  >
  pinned?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  remark?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  replyTo?: Resolver<
    Maybe<GQLResolversTypes['Comment']>,
    ParentType,
    ContextType
  >
  state?: Resolver<GQLResolversTypes['CommentState'], ParentType, ContextType>
  type?: Resolver<GQLResolversTypes['CommentType'], ParentType, ContextType>
  upvotes?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCommentCommentNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CommentCommentNotice'] = GQLResolversParentTypes['CommentCommentNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  comment?: Resolver<GQLResolversTypes['Comment'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Comment'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['CommentCommentNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCommentConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CommentConnection'] = GQLResolversParentTypes['CommentConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['CommentEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCommentEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CommentEdge'] = GQLResolversParentTypes['CommentEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Comment'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLCommentNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CommentNotice'] = GQLResolversParentTypes['CommentNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Comment'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['CommentNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLConnectStripeAccountResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ConnectStripeAccountResult'] = GQLResolversParentTypes['ConnectStripeAccountResult']
> = ResolversObject<{
  redirectUrl?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Connection'] = GQLResolversParentTypes['Connection']
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'AppreciationConnection'
    | 'ArticleConnection'
    | 'ArticleVersionsConnection'
    | 'CampaignConnection'
    | 'CircleConnection'
    | 'CollectionConnection'
    | 'CommentConnection'
    | 'DraftConnection'
    | 'FollowingActivityConnection'
    | 'IcymiTopicConnection'
    | 'InvitationConnection'
    | 'MemberConnection'
    | 'NoticeConnection'
    | 'OAuthClientConnection'
    | 'ReadHistoryConnection'
    | 'RecentSearchConnection'
    | 'ReportConnection'
    | 'ResponseConnection'
    | 'SearchResultConnection'
    | 'SkippedListItemsConnection'
    | 'TagConnection'
    | 'TopDonatorConnection'
    | 'TransactionConnection'
    | 'UserConnection'
    | 'WritingConnection',
    ParentType,
    ContextType
  >
}>

export type GQLCryptoWalletResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['CryptoWallet'] = GQLResolversParentTypes['CryptoWallet']
> = ResolversObject<{
  address?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  hasNFTs?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  nfts?: Resolver<
    Maybe<Array<GQLResolversTypes['NFTAsset']>>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export interface GQLDateTimeScalarConfig
  extends GraphQLScalarTypeConfig<GQLResolversTypes['DateTime'], any> {
  name: 'DateTime'
}

export type GQLDatetimeRangeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['DatetimeRange'] = GQLResolversParentTypes['DatetimeRange']
> = ResolversObject<{
  end?: Resolver<Maybe<GQLResolversTypes['DateTime']>, ParentType, ContextType>
  start?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLDraftResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Draft'] = GQLResolversParentTypes['Draft']
> = ResolversObject<{
  access?: Resolver<GQLResolversTypes['DraftAccess'], ParentType, ContextType>
  article?: Resolver<
    Maybe<GQLResolversTypes['Article']>,
    ParentType,
    ContextType
  >
  assets?: Resolver<Array<GQLResolversTypes['Asset']>, ParentType, ContextType>
  canComment?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  collection?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLDraftCollectionArgs, 'input'>
  >
  content?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  iscnPublish?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >
  license?: Resolver<
    GQLResolversTypes['ArticleLicenseType'],
    ParentType,
    ContextType
  >
  mediaHash?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  publishState?: Resolver<
    GQLResolversTypes['PublishState'],
    ParentType,
    ContextType
  >
  replyToDonator?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  requestForDonation?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  sensitiveByAuthor?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  slug?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  summary?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  summaryCustomized?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  tags?: Resolver<
    Maybe<Array<GQLResolversTypes['String']>>,
    ParentType,
    ContextType
  >
  title?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  wordCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLDraftAccessResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['DraftAccess'] = GQLResolversParentTypes['DraftAccess']
> = ResolversObject<{
  circle?: Resolver<Maybe<GQLResolversTypes['Circle']>, ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['ArticleAccessType'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLDraftConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['DraftConnection'] = GQLResolversParentTypes['DraftConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['DraftEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLDraftEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['DraftEdge'] = GQLResolversParentTypes['DraftEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Draft'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLExchangeRateResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ExchangeRate'] = GQLResolversParentTypes['ExchangeRate']
> = ResolversObject<{
  from?: Resolver<
    GQLResolversTypes['TransactionCurrency'],
    ParentType,
    ContextType
  >
  rate?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  to?: Resolver<GQLResolversTypes['QuoteCurrency'], ParentType, ContextType>
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLFeatureResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Feature'] = GQLResolversParentTypes['Feature']
> = ResolversObject<{
  enabled?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  name?: Resolver<GQLResolversTypes['FeatureName'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLFollowingResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Following'] = GQLResolversParentTypes['Following']
> = ResolversObject<{
  circles?: Resolver<
    GQLResolversTypes['CircleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLFollowingCirclesArgs, 'input'>
  >
  tags?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLFollowingTagsArgs, 'input'>
  >
  users?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLFollowingUsersArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLFollowingActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['FollowingActivity'] = GQLResolversParentTypes['FollowingActivity']
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'ArticleRecommendationActivity'
    | 'CircleRecommendationActivity'
    | 'UserAddArticleTagActivity'
    | 'UserBroadcastCircleActivity'
    | 'UserCreateCircleActivity'
    | 'UserPostMomentActivity'
    | 'UserPublishArticleActivity'
    | 'UserRecommendationActivity',
    ParentType,
    ContextType
  >
}>

export type GQLFollowingActivityConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['FollowingActivityConnection'] = GQLResolversParentTypes['FollowingActivityConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['FollowingActivityEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLFollowingActivityEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['FollowingActivityEdge'] = GQLResolversParentTypes['FollowingActivityEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<
    GQLResolversTypes['FollowingActivity'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLIcymiTopicResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['IcymiTopic'] = GQLResolversParentTypes['IcymiTopic']
> = ResolversObject<{
  archivedAt?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  articles?: Resolver<
    Array<GQLResolversTypes['Article']>,
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  note?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  pinAmount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  publishedAt?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  state?: Resolver<
    GQLResolversTypes['IcymiTopicState'],
    ParentType,
    ContextType
  >
  title?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLIcymiTopicConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['IcymiTopicConnection'] = GQLResolversParentTypes['IcymiTopicConnection']
> = ResolversObject<{
  edges?: Resolver<
    Array<GQLResolversTypes['IcymiTopicEdge']>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLIcymiTopicEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['IcymiTopicEdge'] = GQLResolversParentTypes['IcymiTopicEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['IcymiTopic'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLInvitationResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Invitation'] = GQLResolversParentTypes['Invitation']
> = ResolversObject<{
  acceptedAt?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  circle?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  freePeriod?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  invitee?: Resolver<GQLResolversTypes['Invitee'], ParentType, ContextType>
  inviter?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  sentAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  state?: Resolver<
    GQLResolversTypes['InvitationState'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLInvitationConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['InvitationConnection'] = GQLResolversParentTypes['InvitationConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['InvitationEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLInvitationEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['InvitationEdge'] = GQLResolversParentTypes['InvitationEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Invitation'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLInviteeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Invitee'] = GQLResolversParentTypes['Invitee']
> = ResolversObject<{
  __resolveType: TypeResolveFn<'Person' | 'User', ParentType, ContextType>
}>

export type GQLInvitesResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Invites'] = GQLResolversParentTypes['Invites']
> = ResolversObject<{
  accepted?: Resolver<
    GQLResolversTypes['InvitationConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLInvitesAcceptedArgs, 'input'>
  >
  pending?: Resolver<
    GQLResolversTypes['InvitationConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLInvitesPendingArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLLikerResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Liker'] = GQLResolversParentTypes['Liker']
> = ResolversObject<{
  civicLiker?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  likerId?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  rateUSD?: Resolver<Maybe<GQLResolversTypes['Float']>, ParentType, ContextType>
  total?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMemberResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Member'] = GQLResolversParentTypes['Member']
> = ResolversObject<{
  price?: Resolver<GQLResolversTypes['Price'], ParentType, ContextType>
  user?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMemberConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['MemberConnection'] = GQLResolversParentTypes['MemberConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['MemberEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMemberEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['MemberEdge'] = GQLResolversParentTypes['MemberEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Member'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMomentResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Moment'] = GQLResolversParentTypes['Moment']
> = ResolversObject<{
  assets?: Resolver<Array<GQLResolversTypes['Asset']>, ParentType, ContextType>
  author?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  commentCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  commentedFollowees?: Resolver<
    Array<GQLResolversTypes['User']>,
    ParentType,
    ContextType
  >
  comments?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLMomentCommentsArgs, 'input'>
  >
  content?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  likeCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  liked?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  shortHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  state?: Resolver<GQLResolversTypes['MomentState'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMomentNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['MomentNotice'] = GQLResolversParentTypes['MomentNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Moment'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['MomentNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMonthlyDatumResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['MonthlyDatum'] = GQLResolversParentTypes['MonthlyDatum']
> = ResolversObject<{
  date?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  value?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLMutationResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Mutation'] = GQLResolversParentTypes['Mutation']
> = ResolversObject<{
  addArticlesTags?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationAddArticlesTagsArgs, 'input'>
  >
  addBlockedSearchKeyword?: Resolver<
    GQLResolversTypes['BlockedSearchKeyword'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationAddBlockedSearchKeywordArgs, 'input'>
  >
  addCollectionsArticles?: Resolver<
    Array<GQLResolversTypes['Collection']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationAddCollectionsArticlesArgs, 'input'>
  >
  addCredit?: Resolver<
    GQLResolversTypes['AddCreditResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationAddCreditArgs, 'input'>
  >
  addSocialLogin?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationAddSocialLoginArgs, 'input'>
  >
  addWalletLogin?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationAddWalletLoginArgs, 'input'>
  >
  applyCampaign?: Resolver<
    GQLResolversTypes['Campaign'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationApplyCampaignArgs, 'input'>
  >
  appreciateArticle?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationAppreciateArticleArgs, 'input'>
  >
  changeEmail?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationChangeEmailArgs, 'input'>
  >
  claimLogbooks?: Resolver<
    GQLResolversTypes['ClaimLogbooksResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationClaimLogbooksArgs, 'input'>
  >
  clearReadHistory?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationClearReadHistoryArgs, 'input'>
  >
  clearSearchHistory?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >
  confirmVerificationCode?: Resolver<
    GQLResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationConfirmVerificationCodeArgs, 'input'>
  >
  connectStripeAccount?: Resolver<
    GQLResolversTypes['ConnectStripeAccountResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationConnectStripeAccountArgs, 'input'>
  >
  deleteAnnouncements?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteAnnouncementsArgs, 'input'>
  >
  deleteArticlesTags?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteArticlesTagsArgs, 'input'>
  >
  deleteBlockedSearchKeywords?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteBlockedSearchKeywordsArgs, 'input'>
  >
  deleteCollectionArticles?: Resolver<
    GQLResolversTypes['Collection'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteCollectionArticlesArgs, 'input'>
  >
  deleteCollections?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteCollectionsArgs, 'input'>
  >
  deleteComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteCommentArgs, 'input'>
  >
  deleteDraft?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteDraftArgs, 'input'>
  >
  deleteMoment?: Resolver<
    GQLResolversTypes['Moment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteMomentArgs, 'input'>
  >
  deleteTags?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationDeleteTagsArgs, 'input'>
  >
  directImageUpload?: Resolver<
    GQLResolversTypes['Asset'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationDirectImageUploadArgs, 'input'>
  >
  editArticle?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationEditArticleArgs, 'input'>
  >
  emailLogin?: Resolver<
    GQLResolversTypes['AuthResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationEmailLoginArgs, 'input'>
  >
  generateLikerId?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  generateSigningMessage?: Resolver<
    GQLResolversTypes['SigningMessageResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationGenerateSigningMessageArgs, 'input'>
  >
  invite?: Resolver<
    Maybe<Array<GQLResolversTypes['Invitation']>>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationInviteArgs, 'input'>
  >
  likeMoment?: Resolver<
    GQLResolversTypes['Moment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationLikeMomentArgs, 'input'>
  >
  logRecord?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationLogRecordArgs, 'input'>
  >
  markAllNoticesAsRead?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >
  mergeTags?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationMergeTagsArgs, 'input'>
  >
  migration?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationMigrationArgs, 'input'>
  >
  payTo?: Resolver<
    GQLResolversTypes['PayToResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPayToArgs, 'input'>
  >
  payout?: Resolver<
    GQLResolversTypes['Transaction'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPayoutArgs, 'input'>
  >
  pinComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPinCommentArgs, 'input'>
  >
  publishArticle?: Resolver<
    GQLResolversTypes['Draft'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPublishArticleArgs, 'input'>
  >
  putAnnouncement?: Resolver<
    GQLResolversTypes['Announcement'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutAnnouncementArgs, 'input'>
  >
  putCircle?: Resolver<
    GQLResolversTypes['Circle'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutCircleArgs, 'input'>
  >
  putCircleArticles?: Resolver<
    GQLResolversTypes['Circle'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutCircleArticlesArgs, 'input'>
  >
  putCollection?: Resolver<
    GQLResolversTypes['Collection'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutCollectionArgs, 'input'>
  >
  putComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutCommentArgs, 'input'>
  >
  putDraft?: Resolver<
    GQLResolversTypes['Draft'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutDraftArgs, 'input'>
  >
  putFeaturedTags?: Resolver<
    Maybe<Array<GQLResolversTypes['Tag']>>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutFeaturedTagsArgs, 'input'>
  >
  putIcymiTopic?: Resolver<
    Maybe<GQLResolversTypes['IcymiTopic']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutIcymiTopicArgs, 'input'>
  >
  putMoment?: Resolver<
    GQLResolversTypes['Moment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutMomentArgs, 'input'>
  >
  putOAuthClient?: Resolver<
    Maybe<GQLResolversTypes['OAuthClient']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutOAuthClientArgs, 'input'>
  >
  putRemark?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutRemarkArgs, 'input'>
  >
  putRestrictedUsers?: Resolver<
    Array<GQLResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutRestrictedUsersArgs, 'input'>
  >
  putSkippedListItem?: Resolver<
    Maybe<Array<GQLResolversTypes['SkippedListItem']>>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutSkippedListItemArgs, 'input'>
  >
  putTag?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutTagArgs, 'input'>
  >
  putWritingChallenge?: Resolver<
    GQLResolversTypes['WritingChallenge'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationPutWritingChallengeArgs, 'input'>
  >
  readArticle?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationReadArticleArgs, 'input'>
  >
  refreshIPNSFeed?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationRefreshIpnsFeedArgs, 'input'>
  >
  removeSocialLogin?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationRemoveSocialLoginArgs, 'input'>
  >
  removeWalletLogin?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType
  >
  renameTag?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationRenameTagArgs, 'input'>
  >
  reorderCollectionArticles?: Resolver<
    GQLResolversTypes['Collection'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationReorderCollectionArticlesArgs, 'input'>
  >
  resetLikerId?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationResetLikerIdArgs, 'input'>
  >
  resetPassword?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationResetPasswordArgs, 'input'>
  >
  resetWallet?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationResetWalletArgs, 'input'>
  >
  sendVerificationCode?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationSendVerificationCodeArgs, 'input'>
  >
  setBoost?: Resolver<
    GQLResolversTypes['Node'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSetBoostArgs, 'input'>
  >
  setCurrency?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSetCurrencyArgs, 'input'>
  >
  setEmail?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSetEmailArgs, 'input'>
  >
  setFeature?: Resolver<
    GQLResolversTypes['Feature'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSetFeatureArgs, 'input'>
  >
  setPassword?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSetPasswordArgs, 'input'>
  >
  setUserName?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSetUserNameArgs, 'input'>
  >
  singleFileUpload?: Resolver<
    GQLResolversTypes['Asset'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSingleFileUploadArgs, 'input'>
  >
  socialLogin?: Resolver<
    GQLResolversTypes['AuthResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSocialLoginArgs, 'input'>
  >
  submitReport?: Resolver<
    GQLResolversTypes['Report'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSubmitReportArgs, 'input'>
  >
  subscribeCircle?: Resolver<
    GQLResolversTypes['SubscribeCircleResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationSubscribeCircleArgs, 'input'>
  >
  toggleArticleRecommend?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleArticleRecommendArgs, 'input'>
  >
  toggleBlockUser?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleBlockUserArgs, 'input'>
  >
  toggleFollowCircle?: Resolver<
    GQLResolversTypes['Circle'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleFollowCircleArgs, 'input'>
  >
  toggleFollowTag?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleFollowTagArgs, 'input'>
  >
  toggleFollowUser?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleFollowUserArgs, 'input'>
  >
  togglePinComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationTogglePinCommentArgs, 'input'>
  >
  toggleSeedingUsers?: Resolver<
    Array<Maybe<GQLResolversTypes['User']>>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleSeedingUsersArgs, 'input'>
  >
  toggleSubscribeArticle?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleSubscribeArticleArgs, 'input'>
  >
  toggleTagRecommend?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleTagRecommendArgs, 'input'>
  >
  toggleUsersBadge?: Resolver<
    Array<Maybe<GQLResolversTypes['User']>>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationToggleUsersBadgeArgs, 'input'>
  >
  unbindLikerId?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUnbindLikerIdArgs, 'input'>
  >
  unlikeMoment?: Resolver<
    GQLResolversTypes['Moment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUnlikeMomentArgs, 'input'>
  >
  unpinComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUnpinCommentArgs, 'input'>
  >
  unsubscribeCircle?: Resolver<
    GQLResolversTypes['Circle'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUnsubscribeCircleArgs, 'input'>
  >
  unvoteComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUnvoteCommentArgs, 'input'>
  >
  updateArticleSensitive?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateArticleSensitiveArgs, 'input'>
  >
  updateArticleState?: Resolver<
    GQLResolversTypes['Article'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateArticleStateArgs, 'input'>
  >
  updateArticlesTags?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateArticlesTagsArgs, 'input'>
  >
  updateCampaignApplicationState?: Resolver<
    GQLResolversTypes['Campaign'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateCampaignApplicationStateArgs, 'input'>
  >
  updateCommentsState?: Resolver<
    Array<GQLResolversTypes['Comment']>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateCommentsStateArgs, 'input'>
  >
  updateNotificationSetting?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateNotificationSettingArgs, 'input'>
  >
  updateTagSetting?: Resolver<
    GQLResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateTagSettingArgs, 'input'>
  >
  updateUserExtra?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateUserExtraArgs, 'input'>
  >
  updateUserInfo?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateUserInfoArgs, 'input'>
  >
  updateUserRole?: Resolver<
    GQLResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateUserRoleArgs, 'input'>
  >
  updateUserState?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType,
    RequireFields<GQLMutationUpdateUserStateArgs, 'input'>
  >
  userLogin?: Resolver<
    GQLResolversTypes['AuthResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUserLoginArgs, 'input'>
  >
  userLogout?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  userRegister?: Resolver<
    GQLResolversTypes['AuthResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationUserRegisterArgs, 'input'>
  >
  verifyEmail?: Resolver<
    GQLResolversTypes['AuthResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationVerifyEmailArgs, 'input'>
  >
  voteComment?: Resolver<
    GQLResolversTypes['Comment'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationVoteCommentArgs, 'input'>
  >
  walletLogin?: Resolver<
    GQLResolversTypes['AuthResult'],
    ParentType,
    ContextType,
    RequireFields<GQLMutationWalletLoginArgs, 'input'>
  >
}>

export type GQLNftAssetResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['NFTAsset'] = GQLResolversParentTypes['NFTAsset']
> = ResolversObject<{
  collectionName?: Resolver<
    GQLResolversTypes['String'],
    ParentType,
    ContextType
  >
  contractAddress?: Resolver<
    GQLResolversTypes['String'],
    ParentType,
    ContextType
  >
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  imagePreviewUrl?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  imageUrl?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLNodeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Node'] = GQLResolversParentTypes['Node']
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'Article'
    | 'ArticleVersion'
    | 'Circle'
    | 'Collection'
    | 'Comment'
    | 'Draft'
    | 'IcymiTopic'
    | 'Moment'
    | 'Report'
    | 'Tag'
    | 'User'
    | 'WritingChallenge',
    ParentType,
    ContextType
  >
}>

export type GQLNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Notice'] = GQLResolversParentTypes['Notice']
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'ArticleArticleNotice'
    | 'ArticleNotice'
    | 'CircleNotice'
    | 'CommentCommentNotice'
    | 'CommentNotice'
    | 'MomentNotice'
    | 'OfficialAnnouncementNotice'
    | 'TransactionNotice'
    | 'UserNotice',
    ParentType,
    ContextType
  >
}>

export type GQLNoticeConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['NoticeConnection'] = GQLResolversParentTypes['NoticeConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['NoticeEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLNoticeEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['NoticeEdge'] = GQLResolversParentTypes['NoticeEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Notice'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLNotificationSettingResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['NotificationSetting'] = GQLResolversParentTypes['NotificationSetting']
> = ResolversObject<{
  articleNewAppreciation?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  articleNewCollected?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  articleNewComment?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  articleNewSubscription?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  circleMemberNewBroadcastReply?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  circleMemberNewDiscussion?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  circleMemberNewDiscussionReply?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  circleNewFollower?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  circleNewSubscriber?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  circleNewUnsubscriber?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  email?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  inCircleNewArticle?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inCircleNewBroadcast?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inCircleNewBroadcastReply?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inCircleNewDiscussion?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  inCircleNewDiscussionReply?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  mention?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  newComment?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  newLike?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  userNewFollower?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLOAuthClientResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['OAuthClient'] = GQLResolversParentTypes['OAuthClient']
> = ResolversObject<{
  avatar?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  grantTypes?: Resolver<
    Maybe<Array<GQLResolversTypes['GrantType']>>,
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  redirectURIs?: Resolver<
    Maybe<Array<GQLResolversTypes['String']>>,
    ParentType,
    ContextType
  >
  scope?: Resolver<
    Maybe<Array<GQLResolversTypes['String']>>,
    ParentType,
    ContextType
  >
  secret?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  user?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  website?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLOAuthClientConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['OAuthClientConnection'] = GQLResolversParentTypes['OAuthClientConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['OAuthClientEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLOAuthClientEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['OAuthClientEdge'] = GQLResolversParentTypes['OAuthClientEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['OAuthClient'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLOssResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['OSS'] = GQLResolversParentTypes['OSS']
> = ResolversObject<{
  articles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssArticlesArgs, 'input'>
  >
  badgedUsers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssBadgedUsersArgs, 'input'>
  >
  comments?: Resolver<
    GQLResolversTypes['CommentConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssCommentsArgs, 'input'>
  >
  icymiTopics?: Resolver<
    GQLResolversTypes['IcymiTopicConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssIcymiTopicsArgs, 'input'>
  >
  oauthClients?: Resolver<
    GQLResolversTypes['OAuthClientConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssOauthClientsArgs, 'input'>
  >
  reports?: Resolver<
    GQLResolversTypes['ReportConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssReportsArgs, 'input'>
  >
  restrictedUsers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssRestrictedUsersArgs, 'input'>
  >
  seedingUsers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssSeedingUsersArgs, 'input'>
  >
  skippedListItems?: Resolver<
    GQLResolversTypes['SkippedListItemsConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssSkippedListItemsArgs, 'input'>
  >
  tags?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssTagsArgs, 'input'>
  >
  users?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLOssUsersArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLOfficialResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Official'] = GQLResolversParentTypes['Official']
> = ResolversObject<{
  announcements?: Resolver<
    Maybe<Array<GQLResolversTypes['Announcement']>>,
    ParentType,
    ContextType,
    RequireFields<GQLOfficialAnnouncementsArgs, 'input'>
  >
  features?: Resolver<
    Array<GQLResolversTypes['Feature']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLOfficialAnnouncementNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['OfficialAnnouncementNotice'] = GQLResolversParentTypes['OfficialAnnouncementNotice']
> = ResolversObject<{
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  link?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  message?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLPageInfoResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['PageInfo'] = GQLResolversParentTypes['PageInfo']
> = ResolversObject<{
  endCursor?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  hasNextPage?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  hasPreviousPage?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  startCursor?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLPayToResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['PayToResult'] = GQLResolversParentTypes['PayToResult']
> = ResolversObject<{
  redirectUrl?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  transaction?: Resolver<
    GQLResolversTypes['Transaction'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLPersonResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Person'] = GQLResolversParentTypes['Person']
> = ResolversObject<{
  email?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLPinnableWorkResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['PinnableWork'] = GQLResolversParentTypes['PinnableWork']
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    'Article' | 'Collection',
    ParentType,
    ContextType
  >
}>

export type GQLPriceResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Price'] = GQLResolversParentTypes['Price']
> = ResolversObject<{
  amount?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  circle?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  currency?: Resolver<
    GQLResolversTypes['TransactionCurrency'],
    ParentType,
    ContextType
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  state?: Resolver<GQLResolversTypes['PriceState'], ParentType, ContextType>
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLQueryResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Query'] = GQLResolversParentTypes['Query']
> = ResolversObject<{
  article?: Resolver<
    Maybe<GQLResolversTypes['Article']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryArticleArgs, 'input'>
  >
  campaign?: Resolver<
    Maybe<GQLResolversTypes['Campaign']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryCampaignArgs, 'input'>
  >
  campaigns?: Resolver<
    GQLResolversTypes['CampaignConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLQueryCampaignsArgs, 'input'>
  >
  circle?: Resolver<
    Maybe<GQLResolversTypes['Circle']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryCircleArgs, 'input'>
  >
  exchangeRates?: Resolver<
    Maybe<Array<GQLResolversTypes['ExchangeRate']>>,
    ParentType,
    ContextType,
    Partial<GQLQueryExchangeRatesArgs>
  >
  frequentSearch?: Resolver<
    Maybe<Array<GQLResolversTypes['String']>>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryFrequentSearchArgs, 'input'>
  >
  moment?: Resolver<
    Maybe<GQLResolversTypes['Moment']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryMomentArgs, 'input'>
  >
  node?: Resolver<
    Maybe<GQLResolversTypes['Node']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryNodeArgs, 'input'>
  >
  nodes?: Resolver<
    Maybe<Array<GQLResolversTypes['Node']>>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryNodesArgs, 'input'>
  >
  oauthClient?: Resolver<
    Maybe<GQLResolversTypes['OAuthClient']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryOauthClientArgs, 'input'>
  >
  oauthRequestToken?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  official?: Resolver<GQLResolversTypes['Official'], ParentType, ContextType>
  oss?: Resolver<GQLResolversTypes['OSS'], ParentType, ContextType>
  search?: Resolver<
    GQLResolversTypes['SearchResultConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLQuerySearchArgs, 'input'>
  >
  user?: Resolver<
    Maybe<GQLResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<GQLQueryUserArgs, 'input'>
  >
  viewer?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
}>

export type GQLReadHistoryResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ReadHistory'] = GQLResolversParentTypes['ReadHistory']
> = ResolversObject<{
  article?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  readAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLReadHistoryConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ReadHistoryConnection'] = GQLResolversParentTypes['ReadHistoryConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['ReadHistoryEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLReadHistoryEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ReadHistoryEdge'] = GQLResolversParentTypes['ReadHistoryEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['ReadHistory'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLRecentSearchConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['RecentSearchConnection'] = GQLResolversParentTypes['RecentSearchConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['RecentSearchEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLRecentSearchEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['RecentSearchEdge'] = GQLResolversParentTypes['RecentSearchEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLRecommendationResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Recommendation'] = GQLResolversParentTypes['Recommendation']
> = ResolversObject<{
  authors?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationAuthorsArgs, 'input'>
  >
  following?: Resolver<
    GQLResolversTypes['FollowingActivityConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationFollowingArgs, 'input'>
  >
  hottest?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationHottestArgs, 'input'>
  >
  hottestCircles?: Resolver<
    GQLResolversTypes['CircleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationHottestCirclesArgs, 'input'>
  >
  hottestTags?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationHottestTagsArgs, 'input'>
  >
  icymi?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationIcymiArgs, 'input'>
  >
  icymiTopic?: Resolver<
    Maybe<GQLResolversTypes['IcymiTopic']>,
    ParentType,
    ContextType
  >
  newest?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationNewestArgs, 'input'>
  >
  newestCircles?: Resolver<
    GQLResolversTypes['CircleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationNewestCirclesArgs, 'input'>
  >
  readTagsArticles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationReadTagsArticlesArgs, 'input'>
  >
  selectedTags?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationSelectedTagsArgs, 'input'>
  >
  tags?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLRecommendationTagsArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLReportResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Report'] = GQLResolversParentTypes['Report']
> = ResolversObject<{
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  reason?: Resolver<GQLResolversTypes['ReportReason'], ParentType, ContextType>
  reporter?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Node'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLReportConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ReportConnection'] = GQLResolversParentTypes['ReportConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['ReportEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLReportEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ReportEdge'] = GQLResolversParentTypes['ReportEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Report'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLResponseResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Response'] = GQLResolversParentTypes['Response']
> = ResolversObject<{
  __resolveType: TypeResolveFn<'Article' | 'Comment', ParentType, ContextType>
}>

export type GQLResponseConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ResponseConnection'] = GQLResolversParentTypes['ResponseConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['ResponseEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLResponseEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['ResponseEdge'] = GQLResolversParentTypes['ResponseEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Response'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSearchResultConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SearchResultConnection'] = GQLResolversParentTypes['SearchResultConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['SearchResultEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSearchResultEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SearchResultEdge'] = GQLResolversParentTypes['SearchResultEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Node'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSigningMessageResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SigningMessageResult'] = GQLResolversParentTypes['SigningMessageResult']
> = ResolversObject<{
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  expiredAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  nonce?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  purpose?: Resolver<
    GQLResolversTypes['SigningMessagePurpose'],
    ParentType,
    ContextType
  >
  signingMessage?: Resolver<
    GQLResolversTypes['String'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSkippedListItemResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SkippedListItem'] = GQLResolversParentTypes['SkippedListItem']
> = ResolversObject<{
  archived?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['SkippedListItemType'],
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  uuid?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  value?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSkippedListItemEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SkippedListItemEdge'] = GQLResolversParentTypes['SkippedListItemEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<
    Maybe<GQLResolversTypes['SkippedListItem']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSkippedListItemsConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SkippedListItemsConnection'] = GQLResolversParentTypes['SkippedListItemsConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['SkippedListItemEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSocialAccountResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SocialAccount'] = GQLResolversParentTypes['SocialAccount']
> = ResolversObject<{
  email?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['SocialAccountType'],
    ParentType,
    ContextType
  >
  userName?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLStripeAccountResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['StripeAccount'] = GQLResolversParentTypes['StripeAccount']
> = ResolversObject<{
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  loginUrl?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLSubscribeCircleResultResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['SubscribeCircleResult'] = GQLResolversParentTypes['SubscribeCircleResult']
> = ResolversObject<{
  circle?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  client_secret?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTagResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Tag'] = GQLResolversParentTypes['Tag']
> = ResolversObject<{
  articles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLTagArticlesArgs, 'input'>
  >
  content?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  deleted?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  editors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType,
    Partial<GQLTagEditorsArgs>
  >
  followers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLTagFollowersArgs, 'input'>
  >
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  isFollower?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >
  isOfficial?: Resolver<
    Maybe<GQLResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >
  numArticles?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  numAuthors?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  oss?: Resolver<GQLResolversTypes['TagOSS'], ParentType, ContextType>
  owner?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  participants?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLTagParticipantsArgs, 'input'>
  >
  recommended?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLTagRecommendedArgs, 'input'>
  >
  remark?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  selected?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<GQLTagSelectedArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTagConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TagConnection'] = GQLResolversParentTypes['TagConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['TagEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTagEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TagEdge'] = GQLResolversParentTypes['TagEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Tag'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTagOssResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TagOSS'] = GQLResolversParentTypes['TagOSS']
> = ResolversObject<{
  boost?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  score?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  selected?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTopDonatorConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TopDonatorConnection'] = GQLResolversParentTypes['TopDonatorConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['TopDonatorEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTopDonatorEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TopDonatorEdge'] = GQLResolversParentTypes['TopDonatorEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  donationCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTransactionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Transaction'] = GQLResolversParentTypes['Transaction']
> = ResolversObject<{
  amount?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  blockchainTx?: Resolver<
    Maybe<GQLResolversTypes['BlockchainTransaction']>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  currency?: Resolver<
    GQLResolversTypes['TransactionCurrency'],
    ParentType,
    ContextType
  >
  fee?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  message?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  purpose?: Resolver<
    GQLResolversTypes['TransactionPurpose'],
    ParentType,
    ContextType
  >
  recipient?: Resolver<
    Maybe<GQLResolversTypes['User']>,
    ParentType,
    ContextType
  >
  sender?: Resolver<Maybe<GQLResolversTypes['User']>, ParentType, ContextType>
  state?: Resolver<
    GQLResolversTypes['TransactionState'],
    ParentType,
    ContextType
  >
  target?: Resolver<
    Maybe<GQLResolversTypes['TransactionTarget']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTransactionConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TransactionConnection'] = GQLResolversParentTypes['TransactionConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['TransactionEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTransactionEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TransactionEdge'] = GQLResolversParentTypes['TransactionEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Transaction'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTransactionNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TransactionNotice'] = GQLResolversParentTypes['TransactionNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Transaction'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['TransactionNoticeType'],
    ParentType,
    ContextType
  >
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLTransactionTargetResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TransactionTarget'] = GQLResolversParentTypes['TransactionTarget']
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    'Article' | 'Circle' | 'Transaction',
    ParentType,
    ContextType
  >
}>

export type GQLTranslatedAnnouncementResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['TranslatedAnnouncement'] = GQLResolversParentTypes['TranslatedAnnouncement']
> = ResolversObject<{
  content?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  language?: Resolver<
    GQLResolversTypes['UserLanguage'],
    ParentType,
    ContextType
  >
  link?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  title?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export interface GQLUploadScalarConfig
  extends GraphQLScalarTypeConfig<GQLResolversTypes['Upload'], any> {
  name: 'Upload'
}

export type GQLUserResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['User'] = GQLResolversParentTypes['User']
> = ResolversObject<{
  activity?: Resolver<
    GQLResolversTypes['UserActivity'],
    ParentType,
    ContextType
  >
  analytics?: Resolver<
    GQLResolversTypes['UserAnalytics'],
    ParentType,
    ContextType
  >
  articles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserArticlesArgs, 'input'>
  >
  avatar?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  blockList?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserBlockListArgs, 'input'>
  >
  collections?: Resolver<
    GQLResolversTypes['CollectionConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserCollectionsArgs, 'input'>
  >
  commentedArticles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserCommentedArticlesArgs, 'input'>
  >
  displayName?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  drafts?: Resolver<
    GQLResolversTypes['DraftConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserDraftsArgs, 'input'>
  >
  followers?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserFollowersArgs, 'input'>
  >
  following?: Resolver<GQLResolversTypes['Following'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  info?: Resolver<GQLResolversTypes['UserInfo'], ParentType, ContextType>
  isBlocked?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  isBlocking?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  isFollowee?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  isFollower?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  latestWorks?: Resolver<
    Array<GQLResolversTypes['PinnableWork']>,
    ParentType,
    ContextType
  >
  liker?: Resolver<GQLResolversTypes['Liker'], ParentType, ContextType>
  likerId?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  notices?: Resolver<
    GQLResolversTypes['NoticeConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserNoticesArgs, 'input'>
  >
  oss?: Resolver<GQLResolversTypes['UserOSS'], ParentType, ContextType>
  ownCircles?: Resolver<
    Maybe<Array<GQLResolversTypes['Circle']>>,
    ParentType,
    ContextType
  >
  paymentPointer?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  pinnedWorks?: Resolver<
    Array<GQLResolversTypes['PinnableWork']>,
    ParentType,
    ContextType
  >
  recommendation?: Resolver<
    GQLResolversTypes['Recommendation'],
    ParentType,
    ContextType
  >
  remark?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  settings?: Resolver<
    GQLResolversTypes['UserSettings'],
    ParentType,
    ContextType
  >
  status?: Resolver<
    Maybe<GQLResolversTypes['UserStatus']>,
    ParentType,
    ContextType
  >
  subscribedCircles?: Resolver<
    GQLResolversTypes['CircleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserSubscribedCirclesArgs, 'input'>
  >
  subscriptions?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserSubscriptionsArgs, 'input'>
  >
  tags?: Resolver<
    GQLResolversTypes['TagConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserTagsArgs, 'input'>
  >
  userName?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  wallet?: Resolver<GQLResolversTypes['Wallet'], ParentType, ContextType>
  writings?: Resolver<
    GQLResolversTypes['WritingConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserWritingsArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserActivity'] = GQLResolversParentTypes['UserActivity']
> = ResolversObject<{
  appreciationsReceived?: Resolver<
    GQLResolversTypes['AppreciationConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserActivityAppreciationsReceivedArgs, 'input'>
  >
  appreciationsReceivedTotal?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  appreciationsSent?: Resolver<
    GQLResolversTypes['AppreciationConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserActivityAppreciationsSentArgs, 'input'>
  >
  appreciationsSentTotal?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  history?: Resolver<
    GQLResolversTypes['ReadHistoryConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserActivityHistoryArgs, 'input'>
  >
  recentSearches?: Resolver<
    GQLResolversTypes['RecentSearchConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserActivityRecentSearchesArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserAddArticleTagActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserAddArticleTagActivity'] = GQLResolversParentTypes['UserAddArticleTagActivity']
> = ResolversObject<{
  actor?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Tag'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserAnalyticsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserAnalytics'] = GQLResolversParentTypes['UserAnalytics']
> = ResolversObject<{
  topDonators?: Resolver<
    GQLResolversTypes['TopDonatorConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLUserAnalyticsTopDonatorsArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserBroadcastCircleActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserBroadcastCircleActivity'] = GQLResolversParentTypes['UserBroadcastCircleActivity']
> = ResolversObject<{
  actor?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Comment'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserConnection'] = GQLResolversParentTypes['UserConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['UserEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserCreateCircleActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserCreateCircleActivity'] = GQLResolversParentTypes['UserCreateCircleActivity']
> = ResolversObject<{
  actor?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Circle'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserEdge'] = GQLResolversParentTypes['UserEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserInfoResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserInfo'] = GQLResolversParentTypes['UserInfo']
> = ResolversObject<{
  agreeOn?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  badges?: Resolver<
    Maybe<Array<GQLResolversTypes['Badge']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<
    Maybe<GQLResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  cryptoWallet?: Resolver<
    Maybe<GQLResolversTypes['CryptoWallet']>,
    ParentType,
    ContextType
  >
  description?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  email?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  emailVerified?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  ethAddress?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  featuredTags?: Resolver<
    Maybe<Array<GQLResolversTypes['Tag']>>,
    ParentType,
    ContextType
  >
  group?: Resolver<GQLResolversTypes['UserGroup'], ParentType, ContextType>
  ipnsKey?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  isWalletAuth?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  profileCover?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  socialAccounts?: Resolver<
    Array<GQLResolversTypes['SocialAccount']>,
    ParentType,
    ContextType
  >
  userNameEditable?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserNoticeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserNotice'] = GQLResolversParentTypes['UserNotice']
> = ResolversObject<{
  actors?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  target?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  type?: Resolver<GQLResolversTypes['UserNoticeType'], ParentType, ContextType>
  unread?: Resolver<GQLResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserOssResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserOSS'] = GQLResolversParentTypes['UserOSS']
> = ResolversObject<{
  boost?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  restrictions?: Resolver<
    Array<GQLResolversTypes['UserRestriction']>,
    ParentType,
    ContextType
  >
  score?: Resolver<GQLResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserPostMomentActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserPostMomentActivity'] = GQLResolversParentTypes['UserPostMomentActivity']
> = ResolversObject<{
  actor?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  more?: Resolver<Array<GQLResolversTypes['Moment']>, ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Moment'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserPublishArticleActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserPublishArticleActivity'] = GQLResolversParentTypes['UserPublishArticleActivity']
> = ResolversObject<{
  actor?: Resolver<GQLResolversTypes['User'], ParentType, ContextType>
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Article'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserRecommendationActivityResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserRecommendationActivity'] = GQLResolversParentTypes['UserRecommendationActivity']
> = ResolversObject<{
  nodes?: Resolver<
    Maybe<Array<GQLResolversTypes['User']>>,
    ParentType,
    ContextType
  >
  source?: Resolver<
    Maybe<GQLResolversTypes['UserRecommendationActivitySource']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserRestrictionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserRestriction'] = GQLResolversParentTypes['UserRestriction']
> = ResolversObject<{
  createdAt?: Resolver<GQLResolversTypes['DateTime'], ParentType, ContextType>
  type?: Resolver<
    GQLResolversTypes['UserRestrictionType'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserSettingsResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserSettings'] = GQLResolversParentTypes['UserSettings']
> = ResolversObject<{
  currency?: Resolver<
    GQLResolversTypes['QuoteCurrency'],
    ParentType,
    ContextType
  >
  language?: Resolver<
    GQLResolversTypes['UserLanguage'],
    ParentType,
    ContextType
  >
  notification?: Resolver<
    Maybe<GQLResolversTypes['NotificationSetting']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLUserStatusResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['UserStatus'] = GQLResolversParentTypes['UserStatus']
> = ResolversObject<{
  articleCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  changeEmailTimesLeft?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  commentCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  donatedArticleCount?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  hasEmailLoginPassword?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  hasPaymentPassword?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  receivedDonationCount?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  role?: Resolver<GQLResolversTypes['UserRole'], ParentType, ContextType>
  state?: Resolver<GQLResolversTypes['UserState'], ParentType, ContextType>
  totalReferredCount?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  totalWordCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  unreadFollowing?: Resolver<
    GQLResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  unreadNoticeCount?: Resolver<
    GQLResolversTypes['Int'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLWalletResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Wallet'] = GQLResolversParentTypes['Wallet']
> = ResolversObject<{
  balance?: Resolver<GQLResolversTypes['Balance'], ParentType, ContextType>
  cardLast4?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  customerPortal?: Resolver<
    Maybe<GQLResolversTypes['String']>,
    ParentType,
    ContextType
  >
  stripeAccount?: Resolver<
    Maybe<GQLResolversTypes['StripeAccount']>,
    ParentType,
    ContextType
  >
  transactions?: Resolver<
    GQLResolversTypes['TransactionConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLWalletTransactionsArgs, 'input'>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLWritingResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['Writing'] = GQLResolversParentTypes['Writing']
> = ResolversObject<{
  __resolveType: TypeResolveFn<'Article' | 'Moment', ParentType, ContextType>
}>

export type GQLWritingChallengeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['WritingChallenge'] = GQLResolversParentTypes['WritingChallenge']
> = ResolversObject<{
  applicationPeriod?: Resolver<
    GQLResolversTypes['DatetimeRange'],
    ParentType,
    ContextType
  >
  applicationState?: Resolver<
    Maybe<GQLResolversTypes['CampaignApplicationState']>,
    ParentType,
    ContextType
  >
  articles?: Resolver<
    GQLResolversTypes['ArticleConnection'],
    ParentType,
    ContextType,
    Partial<GQLWritingChallengeArticlesArgs>
  >
  cover?: Resolver<Maybe<GQLResolversTypes['String']>, ParentType, ContextType>
  description?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  id?: Resolver<GQLResolversTypes['ID'], ParentType, ContextType>
  link?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  name?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  participants?: Resolver<
    GQLResolversTypes['UserConnection'],
    ParentType,
    ContextType,
    RequireFields<GQLWritingChallengeParticipantsArgs, 'input'>
  >
  shortHash?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  stages?: Resolver<
    Array<Maybe<GQLResolversTypes['CampaignStage']>>,
    ParentType,
    ContextType
  >
  state?: Resolver<GQLResolversTypes['CampaignState'], ParentType, ContextType>
  writingPeriod?: Resolver<
    GQLResolversTypes['DatetimeRange'],
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLWritingConnectionResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['WritingConnection'] = GQLResolversParentTypes['WritingConnection']
> = ResolversObject<{
  edges?: Resolver<
    Maybe<Array<GQLResolversTypes['WritingEdge']>>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<GQLResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<GQLResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLWritingEdgeResolvers<
  ContextType = Context,
  ParentType extends GQLResolversParentTypes['WritingEdge'] = GQLResolversParentTypes['WritingEdge']
> = ResolversObject<{
  cursor?: Resolver<GQLResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<GQLResolversTypes['Writing'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GQLResolvers<ContextType = Context> = ResolversObject<{
  AddCreditResult?: GQLAddCreditResultResolvers<ContextType>
  Announcement?: GQLAnnouncementResolvers<ContextType>
  Appreciation?: GQLAppreciationResolvers<ContextType>
  AppreciationConnection?: GQLAppreciationConnectionResolvers<ContextType>
  AppreciationEdge?: GQLAppreciationEdgeResolvers<ContextType>
  Article?: GQLArticleResolvers<ContextType>
  ArticleAccess?: GQLArticleAccessResolvers<ContextType>
  ArticleArticleNotice?: GQLArticleArticleNoticeResolvers<ContextType>
  ArticleConnection?: GQLArticleConnectionResolvers<ContextType>
  ArticleContents?: GQLArticleContentsResolvers<ContextType>
  ArticleDonation?: GQLArticleDonationResolvers<ContextType>
  ArticleDonationConnection?: GQLArticleDonationConnectionResolvers<ContextType>
  ArticleDonationEdge?: GQLArticleDonationEdgeResolvers<ContextType>
  ArticleEdge?: GQLArticleEdgeResolvers<ContextType>
  ArticleNotice?: GQLArticleNoticeResolvers<ContextType>
  ArticleOSS?: GQLArticleOssResolvers<ContextType>
  ArticleRecommendationActivity?: GQLArticleRecommendationActivityResolvers<ContextType>
  ArticleTranslation?: GQLArticleTranslationResolvers<ContextType>
  ArticleVersion?: GQLArticleVersionResolvers<ContextType>
  ArticleVersionEdge?: GQLArticleVersionEdgeResolvers<ContextType>
  ArticleVersionsConnection?: GQLArticleVersionsConnectionResolvers<ContextType>
  Asset?: GQLAssetResolvers<ContextType>
  AuthResult?: GQLAuthResultResolvers<ContextType>
  Badge?: GQLBadgeResolvers<ContextType>
  Balance?: GQLBalanceResolvers<ContextType>
  BlockchainTransaction?: GQLBlockchainTransactionResolvers<ContextType>
  BlockedSearchKeyword?: GQLBlockedSearchKeywordResolvers<ContextType>
  Campaign?: GQLCampaignResolvers<ContextType>
  CampaignConnection?: GQLCampaignConnectionResolvers<ContextType>
  CampaignEdge?: GQLCampaignEdgeResolvers<ContextType>
  CampaignStage?: GQLCampaignStageResolvers<ContextType>
  Circle?: GQLCircleResolvers<ContextType>
  CircleAnalytics?: GQLCircleAnalyticsResolvers<ContextType>
  CircleConnection?: GQLCircleConnectionResolvers<ContextType>
  CircleContentAnalytics?: GQLCircleContentAnalyticsResolvers<ContextType>
  CircleContentAnalyticsDatum?: GQLCircleContentAnalyticsDatumResolvers<ContextType>
  CircleEdge?: GQLCircleEdgeResolvers<ContextType>
  CircleFollowerAnalytics?: GQLCircleFollowerAnalyticsResolvers<ContextType>
  CircleIncomeAnalytics?: GQLCircleIncomeAnalyticsResolvers<ContextType>
  CircleNotice?: GQLCircleNoticeResolvers<ContextType>
  CircleRecommendationActivity?: GQLCircleRecommendationActivityResolvers<ContextType>
  CircleSubscriberAnalytics?: GQLCircleSubscriberAnalyticsResolvers<ContextType>
  ClaimLogbooksResult?: GQLClaimLogbooksResultResolvers<ContextType>
  Collection?: GQLCollectionResolvers<ContextType>
  CollectionConnection?: GQLCollectionConnectionResolvers<ContextType>
  CollectionEdge?: GQLCollectionEdgeResolvers<ContextType>
  Comment?: GQLCommentResolvers<ContextType>
  CommentCommentNotice?: GQLCommentCommentNoticeResolvers<ContextType>
  CommentConnection?: GQLCommentConnectionResolvers<ContextType>
  CommentEdge?: GQLCommentEdgeResolvers<ContextType>
  CommentNotice?: GQLCommentNoticeResolvers<ContextType>
  ConnectStripeAccountResult?: GQLConnectStripeAccountResultResolvers<ContextType>
  Connection?: GQLConnectionResolvers<ContextType>
  CryptoWallet?: GQLCryptoWalletResolvers<ContextType>
  DateTime?: GraphQLScalarType
  DatetimeRange?: GQLDatetimeRangeResolvers<ContextType>
  Draft?: GQLDraftResolvers<ContextType>
  DraftAccess?: GQLDraftAccessResolvers<ContextType>
  DraftConnection?: GQLDraftConnectionResolvers<ContextType>
  DraftEdge?: GQLDraftEdgeResolvers<ContextType>
  ExchangeRate?: GQLExchangeRateResolvers<ContextType>
  Feature?: GQLFeatureResolvers<ContextType>
  Following?: GQLFollowingResolvers<ContextType>
  FollowingActivity?: GQLFollowingActivityResolvers<ContextType>
  FollowingActivityConnection?: GQLFollowingActivityConnectionResolvers<ContextType>
  FollowingActivityEdge?: GQLFollowingActivityEdgeResolvers<ContextType>
  IcymiTopic?: GQLIcymiTopicResolvers<ContextType>
  IcymiTopicConnection?: GQLIcymiTopicConnectionResolvers<ContextType>
  IcymiTopicEdge?: GQLIcymiTopicEdgeResolvers<ContextType>
  Invitation?: GQLInvitationResolvers<ContextType>
  InvitationConnection?: GQLInvitationConnectionResolvers<ContextType>
  InvitationEdge?: GQLInvitationEdgeResolvers<ContextType>
  Invitee?: GQLInviteeResolvers<ContextType>
  Invites?: GQLInvitesResolvers<ContextType>
  Liker?: GQLLikerResolvers<ContextType>
  Member?: GQLMemberResolvers<ContextType>
  MemberConnection?: GQLMemberConnectionResolvers<ContextType>
  MemberEdge?: GQLMemberEdgeResolvers<ContextType>
  Moment?: GQLMomentResolvers<ContextType>
  MomentNotice?: GQLMomentNoticeResolvers<ContextType>
  MonthlyDatum?: GQLMonthlyDatumResolvers<ContextType>
  Mutation?: GQLMutationResolvers<ContextType>
  NFTAsset?: GQLNftAssetResolvers<ContextType>
  Node?: GQLNodeResolvers<ContextType>
  Notice?: GQLNoticeResolvers<ContextType>
  NoticeConnection?: GQLNoticeConnectionResolvers<ContextType>
  NoticeEdge?: GQLNoticeEdgeResolvers<ContextType>
  NotificationSetting?: GQLNotificationSettingResolvers<ContextType>
  OAuthClient?: GQLOAuthClientResolvers<ContextType>
  OAuthClientConnection?: GQLOAuthClientConnectionResolvers<ContextType>
  OAuthClientEdge?: GQLOAuthClientEdgeResolvers<ContextType>
  OSS?: GQLOssResolvers<ContextType>
  Official?: GQLOfficialResolvers<ContextType>
  OfficialAnnouncementNotice?: GQLOfficialAnnouncementNoticeResolvers<ContextType>
  PageInfo?: GQLPageInfoResolvers<ContextType>
  PayToResult?: GQLPayToResultResolvers<ContextType>
  Person?: GQLPersonResolvers<ContextType>
  PinnableWork?: GQLPinnableWorkResolvers<ContextType>
  Price?: GQLPriceResolvers<ContextType>
  Query?: GQLQueryResolvers<ContextType>
  ReadHistory?: GQLReadHistoryResolvers<ContextType>
  ReadHistoryConnection?: GQLReadHistoryConnectionResolvers<ContextType>
  ReadHistoryEdge?: GQLReadHistoryEdgeResolvers<ContextType>
  RecentSearchConnection?: GQLRecentSearchConnectionResolvers<ContextType>
  RecentSearchEdge?: GQLRecentSearchEdgeResolvers<ContextType>
  Recommendation?: GQLRecommendationResolvers<ContextType>
  Report?: GQLReportResolvers<ContextType>
  ReportConnection?: GQLReportConnectionResolvers<ContextType>
  ReportEdge?: GQLReportEdgeResolvers<ContextType>
  Response?: GQLResponseResolvers<ContextType>
  ResponseConnection?: GQLResponseConnectionResolvers<ContextType>
  ResponseEdge?: GQLResponseEdgeResolvers<ContextType>
  SearchResultConnection?: GQLSearchResultConnectionResolvers<ContextType>
  SearchResultEdge?: GQLSearchResultEdgeResolvers<ContextType>
  SigningMessageResult?: GQLSigningMessageResultResolvers<ContextType>
  SkippedListItem?: GQLSkippedListItemResolvers<ContextType>
  SkippedListItemEdge?: GQLSkippedListItemEdgeResolvers<ContextType>
  SkippedListItemsConnection?: GQLSkippedListItemsConnectionResolvers<ContextType>
  SocialAccount?: GQLSocialAccountResolvers<ContextType>
  StripeAccount?: GQLStripeAccountResolvers<ContextType>
  SubscribeCircleResult?: GQLSubscribeCircleResultResolvers<ContextType>
  Tag?: GQLTagResolvers<ContextType>
  TagConnection?: GQLTagConnectionResolvers<ContextType>
  TagEdge?: GQLTagEdgeResolvers<ContextType>
  TagOSS?: GQLTagOssResolvers<ContextType>
  TopDonatorConnection?: GQLTopDonatorConnectionResolvers<ContextType>
  TopDonatorEdge?: GQLTopDonatorEdgeResolvers<ContextType>
  Transaction?: GQLTransactionResolvers<ContextType>
  TransactionConnection?: GQLTransactionConnectionResolvers<ContextType>
  TransactionEdge?: GQLTransactionEdgeResolvers<ContextType>
  TransactionNotice?: GQLTransactionNoticeResolvers<ContextType>
  TransactionTarget?: GQLTransactionTargetResolvers<ContextType>
  TranslatedAnnouncement?: GQLTranslatedAnnouncementResolvers<ContextType>
  Upload?: GraphQLScalarType
  User?: GQLUserResolvers<ContextType>
  UserActivity?: GQLUserActivityResolvers<ContextType>
  UserAddArticleTagActivity?: GQLUserAddArticleTagActivityResolvers<ContextType>
  UserAnalytics?: GQLUserAnalyticsResolvers<ContextType>
  UserBroadcastCircleActivity?: GQLUserBroadcastCircleActivityResolvers<ContextType>
  UserConnection?: GQLUserConnectionResolvers<ContextType>
  UserCreateCircleActivity?: GQLUserCreateCircleActivityResolvers<ContextType>
  UserEdge?: GQLUserEdgeResolvers<ContextType>
  UserInfo?: GQLUserInfoResolvers<ContextType>
  UserNotice?: GQLUserNoticeResolvers<ContextType>
  UserOSS?: GQLUserOssResolvers<ContextType>
  UserPostMomentActivity?: GQLUserPostMomentActivityResolvers<ContextType>
  UserPublishArticleActivity?: GQLUserPublishArticleActivityResolvers<ContextType>
  UserRecommendationActivity?: GQLUserRecommendationActivityResolvers<ContextType>
  UserRestriction?: GQLUserRestrictionResolvers<ContextType>
  UserSettings?: GQLUserSettingsResolvers<ContextType>
  UserStatus?: GQLUserStatusResolvers<ContextType>
  Wallet?: GQLWalletResolvers<ContextType>
  Writing?: GQLWritingResolvers<ContextType>
  WritingChallenge?: GQLWritingChallengeResolvers<ContextType>
  WritingConnection?: GQLWritingConnectionResolvers<ContextType>
  WritingEdge?: GQLWritingEdgeResolvers<ContextType>
}>

export type GQLDirectiveResolvers<ContextType = Context> = ResolversObject<{
  auth?: GQLAuthDirectiveResolver<any, any, ContextType>
  cacheControl?: GQLCacheControlDirectiveResolver<any, any, ContextType>
  complexity?: GQLComplexityDirectiveResolver<any, any, ContextType>
  constraint?: GQLConstraintDirectiveResolver<any, any, ContextType>
  logCache?: GQLLogCacheDirectiveResolver<any, any, ContextType>
  objectCache?: GQLObjectCacheDirectiveResolver<any, any, ContextType>
  privateCache?: GQLPrivateCacheDirectiveResolver<any, any, ContextType>
  purgeCache?: GQLPurgeCacheDirectiveResolver<any, any, ContextType>
  rateLimit?: GQLRateLimitDirectiveResolver<any, any, ContextType>
}>
