import type {
  ActionArticle,
  ActionCircle,
  ActionMoment,
  ActionTag,
  ActionUser,
  ActionCollection,
} from './action'
import type { Announcement, AnnouncementTranslation } from './announcement'
import type { Appreciation } from './appreciation'
import type {
  Article,
  ArticleBoost,
  ArticleCircle,
  ArticleConnection,
  ArticleContent,
  ArticleCountView,
  ArticleReadTimeMaterialized,
  ArticleRecommendSetting,
  ArticleTag,
  ArticleTranslation,
  ArticleVersion,
  RecommendedArticlesFromReadTagsMaterialized,
} from './article'
import type { Asset, AssetMap } from './asset'
import type { VerificationCode } from './auth'
import type { EntityType } from './base'
import type {
  Campaign,
  CampaignStage,
  CampaignUser,
  CampaignArticle,
} from './campaign'
import type {
  Circle,
  CircleInvitation,
  CirclePrice,
  CircleSubscription,
  CircleSubscriptionItem,
} from './circle'
import type { Collection, CollectionArticle } from './collection'
import type { Comment, FeaturedCommentMaterialized } from './comment'
import type { Draft } from './draft'
import type {
  BlockedSearchKeyword,
  Blocklist,
  MattersChoice,
  MattersChoiceTopic,
  PunishRecord,
  SearchHistory,
} from './misc'
import type { Moment, MomentAsset } from './moment'
import type { UserOauthLikecoinDB } from './oauth'
import type {
  BlockchainSyncRecord,
  BlockchainTransaction,
  Customer,
  PayoutAccount,
  Transaction,
} from './payment'
import type { Report } from './report'
import type { Tag, TagTranslation, UserTagsOrder } from './tag'
import type { Translation } from './translation'
import type {
  SeedingUser,
  User,
  UserBadge,
  UserIpnsKeys,
  UserIpnsKeys,
  UserRestriction,
  UsernameEditHistory,
} from './user'
import type { CryptoWallet, CryptoWalletSignature } from './wallet'
import type { BasedContext } from '@apollo/server'
import type {
  ArticleService,
  AtomService,
  CampaignService,
  CollectionService,
  CommentService,
  DraftService,
  ExchangeRate,
  MomentService,
  LikeCoin,
  NotificationService,
  OAuthService,
  OpenSeaService,
  PaymentService,
  RecommendationService,
  SystemService,
  TagService,
  UserService,
  UserWorkService,
  TranslationService,
} from 'connectors'
import type {
  PublicationQueue,
  RevisionQueue,
  AssetQueue,
  MigrationQueue,
  PayToByBlockchainQueue,
  PayToByMattersQueue,
  PayoutQueue,
  UserQueue,
} from 'connectors/queue'
import type { Request, Response } from 'express'
import type { Redis } from 'ioredis'
import type { Knex } from 'knex'

export * from './base'
export * from './announcement'
export * from './auth'
export * from './action'
export * from './oauth'
export * from './user'
export * from './article'
export * from './draft'
export * from './tag'
export * from './circle'
export * from './collection'
export * from './comment'
export * from './language'
export * from './notification'
export * from './generic'
export * from './payment'
export * from './appreciation'
export * from './asset'
export * from './report'
export * from './wallet'
export * from './misc'
export * from './schema'
export * from './moment'
export * from './campaign'
export * from './translation'

export interface Context extends BasedContext {
  viewer: Viewer
  req: Request
  res: Response
  dataSources: DataSources
}

export interface Connections {
  knex: Knex
  knexRO: Knex
  knexSearch: Knex
  redis: Redis | Cluster
}

export interface DataSources {
  atomService: AtomService
  articleService: ArticleService
  momentService: MomentService
  commentService: CommentService
  draftService: DraftService
  userService: UserService
  userWorkService: UserWorkService
  systemService: SystemService
  tagService: TagService
  notificationService: NotificationService
  oauthService: OAuthService
  paymentService: PaymentService
  openseaService: OpenSeaService
  collectionService: CollectionService
  recommendationService: RecommendationService
  campaignService: CampaignService
  translationService: TranslationService
  likecoin: LikeCoin
  exchangeRate: ExchangeRate
  connections: Connections
  queues: {
    publicationQueue: PublicationQueue
    revisionQueue: RevisionQueue
    assetQueue: AssetQueue
    migrationQueue: MigrationQueue
    payToByBlockchainQueue: PayToByBlockchainQueue
    payToByMattersQueue: PayToByMattersQueue
    payoutQueue: PayoutQueue
    userQueue: UserQueue
  }
}

export type TableTypeMap = {
  action_article: ActionArticle
  action_circle: ActionCircle
  action_moment: ActionMoment
  action_collection: ActionCollection
  action_tag: ActionTag
  action_user: ActionUser
  announcement: Announcement
  announcement_translation: AnnouncementTranslation
  appreciation: Appreciation
  article: Article
  article_boost: ArticleBoost
  article_circle: ArticleCircle
  article_connection: ArticleConnection
  article_content: ArticleContent
  article_count_view: ArticleCountView
  article_read_time_materialized: ArticleReadTimeMaterialized
  article_recommend_setting: ArticleRecommendSetting
  article_tag: ArticleTag
  article_translation: ArticleTranslation
  article_version: ArticleVersion
  asset: Asset
  asset_map: AssetMap
  blockchain_sync_record: BlockchainSyncRecord
  blockchain_transaction: BlockchainTransaction
  blocked_search_keyword: BlockedSearchKeyword
  blocklist: Blocklist
  campaign: Campaign
  campaign_stage: CampaignStage
  campaign_user: CampaignUser
  campaign_article: CampaignArticle
  circle: Circle
  circle_invitation: CircleInvitation
  circle_price: CirclePrice
  circle_subscription: CircleSubscription
  circle_subscription_item: CircleSubscriptionItem
  collection: Collection
  collection_article: CollectionArticle
  comment: Comment
  crypto_wallet: CryptoWallet
  crypto_wallet_signature: CryptoWalletSignature
  customer: Customer
  draft: Draft
  entity_type: EntityType
  featured_comment_materialized: FeaturedCommentMaterialized
  moment: Moment
  moment_asset: MomentAsset
  matters_choice: MattersChoice
  matters_choice_topic: MattersChoiceTopic
  payout_account: PayoutAccount
  punish_record: PunishRecord
  recommended_articles_from_read_tags_materialized: RecommendedArticlesFromReadTagsMaterialized
  report: Report
  search_history: SearchHistory
  seeding_user: SeedingUser
  tag: Tag
  tag_translation: TagTranslation
  translation: Translation
  transaction: Transaction
  user: User
  user_badge: UserBadge
  user_ipns_keys: UserIpnsKeys
  user_oauth_likecoin: UserOauthLikecoinDB
  user_restriction: UserRestriction
  user_tags_order: UserTagsOrder
  username_edit_history: UsernameEditHistory
  verification_code: VerificationCode
}

export type TableTypeMapKey = keyof TableTypeMap

// table not in TableTypeMap
type OtherTable =
  | 'action_comment'
  | 'article_read_count'
  | 'blockchain_curation_event'
  | 'feedback'
  | 'log_record'
  | 'matters_choice_tag'
  | 'notice'
  | 'oauth_access_token'
  | 'oauth_authorization_code'
  | 'oauth_client'
  | 'oauth_refresh_token'
  | 'oauth_refresh_token'
  | 'social_account'
  | 'tag_boost'
  | 'user_boost'
  | 'user_notify_setting'

export type View =
  | 'tag_count_view'
  | 'user_reader_view'
  | 'article_count_view'
  | 'article_hottest_view'
  | 'transaction_delta_view'
  | 'article_value_view'
  | 'mat_views.tags_lasts'

export type MaterializedView =
  | 'article_count_materialized'
  | 'tag_count_materialized'
  | 'user_reader_materialized'
  | 'article_value_materialized'
  | 'featured_comment_materialized'
  | 'curation_tag_materialized'
  | 'article_hottest_materialized'
  | 'most_active_author_materialized'
  | 'most_appreciated_author_materialized'
  | 'most_trendy_author_materialized'
  | 'user_activity_materialized'
  | 'recently_read_tags_materialized'
  | 'article_read_time_materialized'
  | 'recommended_articles_from_read_tags_materialized'

export type TableName = TableTypeMapKey | View | MaterializedView | OtherTable

export type S3Bucket =
  | 'matters-server-dev'
  | 'matters-server-stage'
  | 'matters-server-production'

export interface Item {
  [key: string]: any
  id: string
}

export interface ItemData {
  [key: string]: any
}

export type ResponseType = 'Article' | 'Comment'

export type TransactionTargetType = 'Article' | 'Transaction'

export type Falsey = '' | 0 | false | null | undefined

export type SkippedListItemType = 'agent_hash' | 'email' | 'domain'

export type Writing = Article | Moment
