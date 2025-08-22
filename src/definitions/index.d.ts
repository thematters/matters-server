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
  ChannelService,
  SearchService,
  PublicationService,
} from '#connectors/index.js'
import type {
  RevisionQueue,
  AssetQueue,
  MigrationQueue,
  PayToByMattersQueue,
  PayoutQueue,
  UserQueue,
} from '#connectors/queue/index.js'
import type {
  ActionArticle,
  ActionCircle,
  ActionComment,
  ActionMoment,
  ActionTag,
  ActionUser,
  ActionCollection,
} from './action.js'
import type {
  Announcement,
  AnnouncementTranslation,
  ChannelAnnouncement,
} from './announcement.js'
import type { Appreciation } from './appreciation.js'
import type {
  Article,
  ArticleBoost,
  ArticleCircle,
  ArticleConnection,
  ArticleContent,
  ArticleCountView,
  ArticleReadCount,
  ArticleReadTimeMaterialized,
  ArticleRecommendSetting,
  ArticleTag,
  ArticleTranslation,
  ArticleVersion,
  ArticleHottestView,
  RecommendedArticlesFromReadTagsMaterialized,
} from './article.js'
import type { Asset, AssetMap } from './asset.js'
import type { VerificationCode } from './auth.js'
import type { EntityType } from './base.js'
import type {
  Campaign,
  CampaignStage,
  CampaignUser,
  CampaignArticle,
  CampaignBoost,
} from './campaign.js'
import type {
  TopicChannel,
  TopicChannelArticle,
  CampaignChannel,
  TagChannel,
  CurationChannel,
  CurationChannelArticle,
  ArticleChannelJob,
} from './channel.js'
import type {
  Circle,
  CircleInvitation,
  CirclePrice,
  CircleSubscription,
  CircleSubscriptionItem,
} from './circle.js'
import type { Collection, CollectionArticle } from './collection.js'
import type { Comment, FeaturedCommentMaterialized } from './comment.js'
import type { Draft } from './draft.js'
import type { TopicChannelFeedback } from './feedback.ts'
import type {
  BlockedSearchKeyword,
  Blocklist,
  FeatureFlag,
  MattersChoice,
  MattersChoiceTopic,
  PunishRecord,
  SearchHistory,
} from './misc.js'
import type { Moment, MomentAsset } from './moment.js'
import type {
  Notice,
  NoticeDetail,
  NoticeEntity,
  NoticeActor,
} from './notification.js'
import type { UserOAuthLikeCoin } from './oauth.js'
import type {
  BlockchainSyncRecord,
  BlockchainTransaction,
  Customer,
  PayoutAccount,
  Transaction,
} from './payment.js'
import type { Report } from './report.js'
import type { Tag, TagTranslation, UserTagsOrder } from './tag.js'
import type { Translation } from './translation.js'
import type {
  SeedingUser,
  User,
  UserBadge,
  UserIpnsKeys,
  UserRestriction,
  UsernameEditHistory,
  UserFeatureFlag,
  UserNotifySetting,
} from './user.js'
import type { CryptoWallet, CryptoWalletSignature } from './wallet.js'
import type { BasedContext } from '@apollo/server'
import type { Request, Response } from 'express'
import type { Redis } from 'ioredis'
import type { Knex } from 'knex'

// Add exports for the GraphQL generated types
export * from './schema.js'

export * from './base.js'
export * from './announcement.js'
export * from './auth.js'
export * from './action.js'
export * from './oauth.js'
export * from './user.js'
export * from './article.js'
export * from './draft.js'
export * from './tag.js'
export * from './circle.js'
export * from './collection.js'
export * from './comment.js'
export * from './language.js'
export * from './notification.js'
export * from './generic.js'
export * from './payment.js'
export * from './appreciation.js'
export * from './asset.js'
export * from './report.js'
export * from './wallet.js'
export * from './misc.js'
export * from './schema.js'
export * from './moment.js'
export * from './campaign.js'
export * from './translation.js'
export * from './channel.js'
export * from './nominal.js'
export * from './feedback.js'
export * from './userRetention.js'

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
  redis: Redis
  objectCacheRedis: Redis
}

export interface DataSources {
  atomService: AtomService
  articleService: ArticleService
  publicationService: PublicationService
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
  channelService: ChannelService
  searchService: SearchService
  likecoin: LikeCoin
  exchangeRate: ExchangeRate
  connections: Connections
  queues: {
    revisionQueue: RevisionQueue
    assetQueue: AssetQueue
    migrationQueue: MigrationQueue
    payToByMattersQueue: PayToByMattersQueue
    payoutQueue: PayoutQueue
    userQueue: UserQueue
  }
}

export interface TableTypeMap {
  action_article: ActionArticle
  action_circle: ActionCircle
  action_comment: ActionComment
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
  article_read_count: ArticleReadCount
  article_read_time_materialized: ArticleReadTimeMaterialized
  article_recommend_setting: ArticleRecommendSetting
  article_tag: ArticleTag
  article_translation: ArticleTranslation
  article_version: ArticleVersion
  article_hottest_view: ArticleHottestView
  article_channel_job: ArticleChannelJob
  topic_channel: TopicChannel
  topic_channel_article: TopicChannelArticle
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
  campaign_boost: CampaignBoost
  campaign_channel: CampaignChannel
  tag_channel: TagChannel
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
  feature_flag: FeatureFlag
  moment: Moment
  moment_asset: MomentAsset
  matters_choice: MattersChoice
  matters_choice_topic: MattersChoiceTopic
  notice: Notice
  notice_detail: NoticeDetail
  notice_entity: NoticeEntity
  notice_actor: NoticeActor
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
  user_oauth_likecoin: UserOAuthLikeCoin
  user_restriction: UserRestriction
  user_feature_flag: UserFeatureFlag
  user_tags_order: UserTagsOrder
  username_edit_history: UsernameEditHistory
  verification_code: VerificationCode
  curation_channel: CurationChannel
  curation_channel_article: CurationChannelArticle
  channel_announcement: ChannelAnnouncement
  topic_channel_feedback: TopicChannelFeedback
  user_notify_setting: UserNotifySetting
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
  // | 'tag_count_view'
  | 'tag_stats_view'
  | 'user_reader_view'
  | 'article_count_view'
  | 'article_hottest_view'
  | 'transaction_delta_view'
  | 'article_value_view'
  | 'mat_views.tags_lasts'

export type MaterializedView =
  | 'article_count_materialized'
  // | 'tag_count_materialized'
  | 'tag_stats_materialized'
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
