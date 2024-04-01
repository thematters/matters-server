import type { BasedContext } from '@apollo/server'
import type {
  ArticleService,
  AtomService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  OpenSeaService,
  PaymentService,
  SystemService,
  TagService,
  UserService,
  CollectionService,
  LikeCoin,
  ExchangeRate,
  RecommendationService,
} from 'connectors'
import type {
  PublicationQueue,
  RevisionQueue,
  AssetQueue,
  AppreciationQueue,
  MigrationQueue,
  PayToByBlockchainQueue,
  PayToByMattersQueue,
  PayoutQueue,
  UserQueue,
} from 'connectors/queues'
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
export * from './chapter'
export * from './circle'
export * from './collection'
export * from './comment'
export * from './language'
export * from './notification'
export * from './generic'
export * from './payment'
export * from './appreciation'
export * from './asset'
export * from './topic'
export * from './report'
export * from './wallet'
export * from './misc'
export * from './schema'

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
}

export interface DataSources {
  atomService: AtomService
  articleService: ArticleService
  commentService: CommentService
  draftService: DraftService
  userService: UserService
  systemService: SystemService
  tagService: TagService
  notificationService: NotificationService
  oauthService: OAuthService
  paymentService: PaymentService
  openseaService: OpenSeaService
  collectionService: CollectionService
  recommendationService: RecommendationService
  likecoin: LikeCoin
  exchangeRate: ExchangeRate
  connections: Connections
  queues: {
    publicationQueue: PublicationQueue
    revisionQueue: RevisionQueue
    assetQueue: AssetQueue
    appreciationQueue: AppreciationQueue
    migrationQueue: MigrationQueue
    payToByBlockchainQueue: PayToByBlockchainQueue
    payToByMattersQueue: PayToByMattersQueue
    payoutQueue: PayoutQueue
    userQueue: UserQueue
  }
}

export type BasicTableName =
  | 'action'
  | 'article_boost'
  | 'action_user'
  | 'action_comment'
  | 'action_article'
  | 'action_tag'
  | 'transaction'
  | 'appreciation'
  | 'asset'
  | 'asset_map'
  | 'article'
  | 'article_read_count'
  | 'article_tag'
  | 'audio_draft'
  | 'comment'
  | 'article_connection'
  | 'draft'
  | 'noop'
  | 'user'
  | 'user_oauth'
  | 'user_badge'
  | 'user_notify_setting'
  | 'user_restriction'
  | 'username_edit_history'
  | 'notice_detail'
  | 'notice'
  | 'notice_actor'
  | 'notice_entity'
  | 'push_device'
  | 'report'
  | 'feedback'
  | 'feedback_asset'
  | 'invitation'
  | 'verification_code'
  | 'search_history'
  | 'tag'
  | 'tag_boost'
  | 'user_boost'
  | 'matters_today'
  | 'matters_choice'
  | 'matters_choice_tag'
  | 'article_recommend_setting'
  | 'log_record'
  | 'oauth_client'
  | 'oauth_access_token'
  | 'oauth_authorization_code'
  | 'oauth_refresh_token'
  | 'user_oauth_likecoin'
  | 'blocklist'
  | 'blocked_search_keyword'
  | 'transaction'
  | 'customer'
  | 'payout_account'
  | 'punish_record'
  | 'entity_type'
  | 'circle'
  | 'circle_invitation'
  | 'circle_price'
  | 'circle_subscription'
  | 'circle_subscription_item'
  | 'action_circle'
  | 'article_circle'
  | 'feature_flag'
  | 'seeding_user'
  | 'announcement'
  | 'announcement_translation'
  | 'topic'
  | 'article_topic'
  | 'chapter'
  | 'article_chapter'
  | 'crypto_wallet'
  | 'crypto_wallet_signature'
  | 'article_translation'
  | 'tag_translation'
  | 'user_ipns_keys'
  | 'user_tags_order'
  | 'blockchain_transaction'
  | 'blockchain_curation_event'
  | 'blockchain_sync_record'
  | 'collection'
  | 'collection_article'
  | 'social_account'
  | 'article_content'
  | 'article_version'
  | 'matters_choice_topic'

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

export type TableName = BasicTableName | View | MaterializedView

export interface EntityType {
  id: string
  table: TableName
}

export interface ThirdPartyAccount {
  accountName: 'facebook' | 'wechat' | 'google'
  baseUrl: string
  token: string
}

export interface BatchParams {
  input: {
    [key: string]: any
  }
}

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
