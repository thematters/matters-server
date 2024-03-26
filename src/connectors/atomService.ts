import type {
  ActionArticle,
  ActionCircle,
  ActionTag,
  ActionUser,
  Announcement,
  AnnouncementTranslation,
  Appreciation,
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
  Asset,
  AssetMap,
  BlockchainSyncRecord,
  BlockchainTransaction,
  BlockedSearchKeyword,
  Blocklist,
  Circle,
  CircleInvitation,
  CirclePrice,
  CircleSubscription,
  CircleSubscriptionItem,
  Collection,
  CollectionArticle,
  Comment,
  Connections,
  CryptoWallet,
  CryptoWalletSignature,
  Customer,
  Draft,
  EntityType,
  FeaturedCommentMaterialized,
  MattersChoice,
  MattersChoiceTopic,
  PayoutAccount,
  PunishRecord,
  RecommendedArticlesFromReadTagsMaterialized,
  Report,
  SearchHistory,
  SeedingUser,
  TableName,
  Tag,
  TagTranslation,
  Transaction,
  User,
  UserBadge,
  UserIpnsKeys,
  UserOauthLikecoinDB,
  UserRestriction,
  UserTagsOrder,
  UsernameEditHistory,
  VerificationCode,
} from 'definitions'
import type { Knex } from 'knex'

import DataLoader from 'dataloader'

import {
  EntityNotFoundError,
  ArticleNotFoundError,
  CommentNotFoundError,
} from 'common/errors'

type Mode = 'id' | 'uuid'

type TableTypeMap = {
  announcement: Announcement
  announcement_translation: AnnouncementTranslation
  blocked_search_keyword: BlockedSearchKeyword
  blocklist: Blocklist
  matters_choice: MattersChoice
  user: User
  user_ipns_keys: UserIpnsKeys
  username_edit_history: UsernameEditHistory
  user_restriction: UserRestriction
  asset: Asset
  asset_map: AssetMap
  draft: Draft
  article: Article
  article_version: ArticleVersion
  article_content: ArticleContent
  article_circle: ArticleCircle
  article_translation: ArticleTranslation
  article_tag: ArticleTag
  article_boost: ArticleBoost
  article_connection: ArticleConnection
  article_recommend_setting: ArticleRecommendSetting
  article_count_view: ArticleCountView
  article_read_time_materialized: ArticleReadTimeMaterialized
  collection: Collection
  collection_article: CollectionArticle
  comment: Comment
  featured_comment_materialized: FeaturedCommentMaterialized
  action_user: ActionUser
  action_article: ActionArticle
  action_circle: ActionCircle
  action_tag: ActionTag
  circle: Circle
  circle_price: CirclePrice
  circle_invitation: CircleInvitation
  circle_subscription: CircleSubscription
  circle_subscription_item: CircleSubscriptionItem
  customer: Customer
  crypto_wallet: CryptoWallet
  crypto_wallet_signature: CryptoWalletSignature
  tag: Tag
  tag_translation: TagTranslation
  user_tags_order: UserTagsOrder
  verification_code: VerificationCode
  punish_record: PunishRecord
  search_history: SearchHistory
  payout_account: PayoutAccount
  transaction: Transaction
  blockchain_transaction: BlockchainTransaction
  blockchain_sync_record: BlockchainSyncRecord
  entity_type: EntityType
  appreciation: Appreciation
  seeding_user: SeedingUser
  user_oauth_likecoin: UserOauthLikecoinDB
  user_badge: UserBadge
  report: Report
  recommended_articles_from_read_tags_materialized: RecommendedArticlesFromReadTagsMaterialized
  matters_choice_topic: MattersChoiceTopic
}

type TableTypeMapKey = keyof TableTypeMap

interface InitLoaderInput {
  table: TableTypeMapKey
  mode: Mode
  error?: Error
}

type FindUniqueFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where: { id: string } | { hash: string } | { uuid: string }
}) => Promise<D>

type FindFirstFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  select?: keyof D[]
  where:
    | Partial<Record<keyof D, any>>
    | ((builder: Knex.QueryBuilder) => Knex.QueryBuilder<D, D>)
  whereIn?: [string, string[]]
  orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
}) => Promise<D>

type FindManyFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  select?: Array<keyof D>
  where?:
    | Partial<Record<keyof D, any>>
    | ((builder: Knex.QueryBuilder) => Knex.QueryBuilder<D, D>)

  whereIn?: [string, string[]]
  orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
  orderByRaw?: string
  modifier?: (builder: Knex.QueryBuilder) => void
  skip?: number
  take?: number
}) => Promise<D[]>

type CreateFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  data: Partial<D>
}) => Promise<D>

type UpdateFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where: Partial<Record<keyof D, any>>
  data: Partial<D>
  columns?: Array<keyof D> | '*'
}) => Promise<D>

type UpdateManyFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where: Partial<Record<keyof D, any>>
  data: Partial<D>
  columns?: Array<keyof D> | '*'
}) => Promise<D[]>

type UpdateJsonColumnFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where: Partial<Record<keyof D, any>>
  jsonColumn?: string // default extra column name is 'extra'
  removeKeys?: string[] // keys to remove from extra json column
  jsonData?: Record<string, any> | null
  // resetNull?; boolean
  columns?: string[] | '*' // returning columns
}) => Promise<D>

type UpsertFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where?: Partial<Record<keyof D, any>>
  create: Partial<D>
  update: Partial<D>
}) => Promise<D>

type DeleteManyFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where?: Partial<Record<keyof D, any>>
  whereIn?: [string, string[]]
}) => Promise<void>

type CountFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where?: Partial<Record<keyof D, any>>
  whereIn?: [string, string[]]
}) => Promise<number>

type MaxFn = <
  Table extends TableTypeMapKey,
  D extends TableTypeMap[Table]
>(params: {
  table: Table
  where: Partial<Record<keyof D, any>>
  column: keyof D
}) => Promise<number>

interface AtomDataLoader<K, V> {
  load: (key: K) => Promise<V>
  loadMany: (keys: readonly K[]) => Promise<V[]>
}

/**
 * This object is a container for data loaders or system wide services.
 */
export class AtomService {
  private knex: Knex

  public articleIdLoader: AtomDataLoader<string, Article>
  public articleVersionIdLoader: AtomDataLoader<string, ArticleVersion>
  public articleContentIdLoader: AtomDataLoader<string, ArticleContent>
  public circleIdLoader: AtomDataLoader<string, Circle>
  public commentIdLoader: AtomDataLoader<string, Comment>
  public collectionIdLoader: AtomDataLoader<string, Collection>
  public draftIdLoader: AtomDataLoader<string, Draft>
  public userIdLoader: AtomDataLoader<string, User>
  public tagIdLoader: AtomDataLoader<string, Tag>
  public transactionIdLoader: AtomDataLoader<string, Transaction>
  public icymiTopicIdLoader: AtomDataLoader<string, MattersChoiceTopic>

  public constructor(connections: Connections) {
    this.knex = connections.knex

    this.articleIdLoader = this.initLoader({
      table: 'article',
      mode: 'id',
      error: new ArticleNotFoundError('Cannot find article'),
    })
    this.articleVersionIdLoader = this.initLoader({
      table: 'article_version',
      mode: 'id',
    })
    this.articleContentIdLoader = this.initLoader({
      table: 'article_content',
      mode: 'id',
    })
    this.draftIdLoader = this.initLoader({ table: 'draft', mode: 'id' })
    this.commentIdLoader = this.initLoader({
      table: 'comment',
      mode: 'id',
      error: new CommentNotFoundError('Cannot find comment'),
    })
    this.collectionIdLoader = this.initLoader({
      table: 'collection',
      mode: 'id',
    })
    this.circleIdLoader = this.initLoader({ table: 'circle', mode: 'id' })
    this.userIdLoader = this.initLoader({ table: 'user', mode: 'id' })
    this.tagIdLoader = this.initLoader({ table: 'tag', mode: 'id' })
    this.transactionIdLoader = this.initLoader({
      table: 'transaction',
      mode: 'id',
    })
    this.icymiTopicIdLoader = this.initLoader({
      table: 'matters_choice_topic',
      mode: 'id',
    })
  }

  /* Data Loader */

  /**
   * Initialize typical data loader.
   *
   * @remark
   *
   * loader throw error when it cannot find some entities.
   */
  public initLoader = <T>({
    table,
    mode,
    error,
  }: InitLoaderInput): AtomDataLoader<string, T> => {
    const batchFn = async (keys: readonly string[]) => {
      const records = await this.findMany({
        table,
        whereIn: [mode, keys as string[]],
      })

      if (records.findIndex((item: unknown) => !item) >= 0) {
        if (error) {
          throw error
        }
        throw new EntityNotFoundError(`Cannot find entity from ${table}`)
      }

      // fix order based on keys
      return keys.map((key) =>
        records.find((r: any) => r[mode] === key.toString())
      ) as T[]
    }
    return new DataLoader(batchFn) as AtomDataLoader<string, T>
  }

  /* Basic CRUD */

  /**
   * Find an unique record.
   *
   * A Prisma like method for retrieving a record by specified id.
   */
  public findUnique: FindUniqueFn = async ({ table, where }) =>
    this.knex.select().from(table).where(where).first()

  /**
   * Find the first record in rows.
   *
   * A Prisma like method for getting the first record in rows.
   */
  public findFirst: FindFirstFn = async ({
    table,
    where,
    whereIn,
    orderBy,
  }) => {
    const query = this.knex.select().from(table).where(where)

    if (whereIn) {
      query.whereIn(...whereIn)
    }

    if (orderBy) {
      query.orderBy(orderBy)
    }

    return query.first()
  }

  /**
   * Find multiple records by given clauses.
   *
   * A Prisma like method for fetching records.
   */
  public findMany: FindManyFn = async ({
    table,
    select = ['*'],
    where,
    whereIn,
    orderBy,
    orderByRaw,
    modifier,
    skip,
    take,
  }) => {
    const query = this.knex.select(select).from(table)

    if (where) {
      query.where(where)
    }

    if (whereIn) {
      query.whereIn(...whereIn)
    }

    if (orderBy) {
      query.orderBy(orderBy)
    }

    if (orderByRaw) {
      query.orderByRaw(orderByRaw)
    }

    if (modifier) {
      query.modify(modifier)
    }

    if (skip) {
      query.offset(skip)
    }

    if (take || take === 0) {
      query.limit(take)
    }
    return query
  }

  /**
   * Create a new record by given data.
   *
   * A Prisma like method for creating one record.
   */
  public create: CreateFn = async ({ table, data }) => {
    const [record] = await this.knex(table).insert(data).returning('*')
    return record
  }

  /**
   * Update an unique record.
   *
   * A Prisma like method for updating a record.
   */
  public update: UpdateFn = async ({ table, where, data, columns = '*' }) => {
    const [record] = await this.knex
      .where(where)
      .update(
        isUpdateableTable(table)
          ? { ...data, updatedAt: this.knex.fn.now() }
          : data
      )
      .into(table)
      .returning(columns as string)
    return record
  }

  public updateJsonColumn: UpdateJsonColumnFn = async ({
    table,
    where,
    jsonColumn = 'extra', // the json column's name
    removeKeys = [], // the keys to remove from jsonb data
    jsonData, // the extra data to append into jsonb data
    // resetNull,
    columns = '*',
  }) => {
    const [record] = await this.knex
      .table(table)
      .where(where)
      .update(
        jsonColumn,
        jsonData == null
          ? null
          : this.knex.raw(
              String.raw`(COALESCE(:jsonColumn:, '{}'::jsonb) - :removeKeys ::text[]) || :jsonData ::jsonb`,
              {
                jsonColumn,
                removeKeys,
                jsonData,
              }
            )
      )
      .update('updatedAt', this.knex.fn.now())
      .returning(columns)
    return record
  }

  /**
   * Update many records.
   *
   * A Prisma like method for updating many records.
   */
  public updateMany: UpdateManyFn = async ({
    table,
    where,
    data,
    columns = '*',
  }) => {
    const records = await this.knex
      .where(where)
      .update(
        isUpdateableTable(table)
          ? { ...data, updatedAt: this.knex.fn.now() }
          : data
      )
      .into(table)
      .returning(columns as string)
    return records
  }

  /**
   * Upsert an unique record.
   *
   * A Prisma like method for updating or creating a record.
   */
  public upsert: UpsertFn = async ({ table, where, create, update }) => {
    // TODO: Use onConflict instead
    // @see {@link https://github.com/knex/knex/pull/3763}
    const record = await this.knex(table)
      .select()
      .where(where as Record<string, any>)
      .first()

    // create
    if (!record) {
      return this.knex(table).insert(create).returning('*')
    }

    // update
    const [updatedRecord] = await this.knex(table)
      .where(where as Record<string, any>)
      .update(
        isUpdateableTable(table)
          ? { ...update, updatedAt: this.knex.fn.now() }
          : update
      )
      .returning('*')

    return updatedRecord
  }

  /**
   * Delete records.
   *
   * A Prisma like method for deleting multiple records.
   */
  public deleteMany: DeleteManyFn = async ({ table, where, whereIn }) => {
    const action = this.knex(table)
    if (where) {
      action.where(where as Record<string, any>)
    }
    if (whereIn) {
      action.whereIn(...whereIn)
    }
    await action.del()
  }

  /**
   * Count records.
   *
   * A Prisma like method for counting records.
   */
  public count: CountFn = async ({ table, where, whereIn }) => {
    const action = this.knex.count().from(table)
    if (where) {
      action.where(where)
    }
    if (whereIn) {
      action.whereIn(...whereIn)
    }
    const record = await action.first()

    return parseInt(record ? (record.count as string) : '0', 10)
  }

  /**
   * Max of given column.
   *
   * A Prisma like method for getting max.
   */
  public max: MaxFn = async ({ table, where, column }) => {
    const record = await this.knex(table).max(column).where(where).first()
    return parseInt(record ? (record.count as string) : '0', 10)
  }
}

export const isUpdateableTable = (table: TableName) =>
  UPATEABLE_TABLES.includes(table)

const UPATEABLE_TABLES = [
  'user',
  'user_oauth',
  'user_notify_setting',
  'article',
  'tag',
  'article_tag',
  'comment',
  'action_user',
  'action_comment',
  'action_article',
  'draft',
  'audio_draft',
  'notice',
  'asset',
  'verification_code',
  'push_device',
  'matters_today',
  'matters_choice',
  'article_boost',
  'tag_boost',
  'user_boost',
  'article_version',
  'article_connection',
  'oauth_client',
  'oauth_access_token',
  'oauth_authorization_code',
  'oauth_refresh_token',
  'user_oauth_likecoin',
  'article_read_count',
  'blocklist',
  'transaction',
  'punish_record',
  'feature_flag',
  'payout_account',
  'action_tag',
  'matters_choice_tag',
  'circle',
  'action_circle',
  'circle_price',
  'article_circle',
  'circle_subscription',
  'circle_subscription_item',
  'circle_invoice',
  'seeding_user',
  'announcement',
  'crypto_wallet',
  'crypto_wallet_signature',
  'article_translation',
  'tag_translation',
  'user_ipns_keys',
  'user_tags_order',
  'announcement_translation',
  'blockchain_sync_record',
  'blockchain_transaction',
  'collection',
  'matters_choice_topic',
]
