import type { BasedContext } from '@apollo/server'
import type { Request, Response } from 'express'
import type { Redis } from 'ioredis'
import type { Knex } from 'knex'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_STATE,
  TRANSACTION_PURPOSE,
  VERIFICATION_CODE_STATUS,
} from 'common/enums'
import {
  Alchemy,
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
} from 'connectors'

export * from './user'
export * from './article'
export * from './draft'
export * from './tag'
export * from './circle'
export * from './collection'
export * from './comment'
export * from './language'
export * from './schema'
export * from './notification'
export * from './generic'
export * from './payment'

export interface Context extends BasedContext {
  viewer: Viewer
  req: Request
  res: Response
  knex: Knex
  dataSources: DataSources
}

export interface DataSources {
  atomService: InstanceType<typeof AtomService>
  articleService: InstanceType<typeof ArticleService>
  commentService: InstanceType<typeof CommentService>
  draftService: InstanceType<typeof DraftService>
  userService: InstanceType<typeof UserService>
  systemService: InstanceType<typeof SystemService>
  tagService: InstanceType<typeof TagService>
  notificationService: InstanceType<typeof NotificationService>
  oauthService: InstanceType<typeof OAuthService>
  paymentService: InstanceType<typeof PaymentService>
  openseaService: InstanceType<typeof OpenSeaService>
  collectionService: InstanceType<typeof CollectionService>
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
  | 'report_asset'
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

/**
 * Payment
 */
export interface Customer {
  id: string
  userId: string
  provider: string
  customerId: string
  cardLast4: string
}

export interface CircleSubscription {
  id: string
  state: string
  userId: string
  provider: string
  providerSubscriptionId: string
}

export interface CirclePrice {
  id: string
  amount: number
  currency: PAYMENT_CURRENCY
  circleId: string
  provider: PAYMENT_PROVIDER
  providerPriceId: string
}

export interface Transaction {
  id: string
  amount: string
  currency: PAYMENT_CURRENCY
  state: TRANSACTION_STATE
  purpose: TRANSACTION_PURPOSE
  provider: PAYMENT_PROVIDER
  providerTxId: string
  senderId: string
  recipientId: string
  targetId: string
  targetType: string
  fee: string
  remark: string
  parentId: string
  createdAt: string
  updatedAt: string
}
