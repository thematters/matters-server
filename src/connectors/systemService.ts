import type {
  ItemData,
  SkippedListItemType,
  Viewer,
  Connections,
  ReportType,
  ReportReason,
  Report,
  ModerationActorType,
  ModerationAutomationRole,
  ModerationCase,
  ModerationCaseOutcome,
  ModerationCaseSource,
  ModerationCaseStatus,
  ModerationEventType,
  ModerationNoticeState,
  ModerationTargetType,
  Asset,
  BaseDBSchema,
  LogRecord,
  Blocklist,
  TableName,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ASSET_TYPE,
  IMAGE_ASSET_TYPE,
  SKIPPED_LIST_ITEM_TYPES,
  USER_ROLE,
  FEATURE_NAME,
  FEATURE_FLAG,
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
  CACHE_PREFIX,
  CACHE_TTL,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from '#common/enums/index.js'
import { environment, isTest } from '#common/environment.js'
import { AssetNotFoundError, UserInputError } from '#common/errors.js'
import { getLogger, auditLog } from '#common/logger.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { v4 } from 'uuid'

import { BaseService } from './baseService.js'
import { Cache } from './cache/index.js'
const logger = getLogger('service-system')

export class SystemService extends BaseService<BaseDBSchema> {
  private featureFlagTable: TableName = 'feature_flag'

  public constructor(connections: Connections) {
    // @ts-ignore
    super('noop', connections)
  }

  /*********************************
   *                               *
   *            Features           *
   *                               *
   *********************************/

  public getFeatureFlags = () =>
    this.knexRO(this.featureFlagTable).select('*').limit(50)

  public getFeatureFlag = async (name: keyof typeof FEATURE_NAME) => {
    const [featureFlag] = await this.knexRO(this.featureFlagTable).where({
      name,
    })
    return featureFlag
  }

  public setFeatureFlag = async ({
    name,
    flag,
    value,
  }: {
    name: keyof typeof FEATURE_NAME
    flag: keyof typeof FEATURE_FLAG
    value?: number
  }) => {
    const { flag: oldFlag, value: oldValue } = await this.getFeatureFlag(name)
    const [featureFlag] = await this.knex
      .where({ name })
      .update({
        name,
        flag,
        value: value || null,
        updatedAt: this.knex.fn.now(),
      })
      .into(this.featureFlagTable)
      .returning('*')

    auditLog({
      actorId: null,
      action: AUDIT_LOG_ACTION.setFeatureFlag,
      status: AUDIT_LOG_STATUS.succeeded,
      entity: this.featureFlagTable,
      entityId: featureFlag.id,
      newValue: JSON.stringify({ flag, value }),
      oldValue: JSON.stringify({ flag: oldFlag, value: oldValue }),
      remark: `Set feature flag ${name} to ${flag} with value ${value}`,
    })

    return featureFlag
  }

  public isFeatureEnabled = async (
    flag: keyof typeof FEATURE_FLAG,
    viewer: Viewer
  ) => {
    switch (flag) {
      case FEATURE_FLAG.on: {
        return true
      }
      case FEATURE_FLAG.admin: {
        return viewer.role === USER_ROLE.admin
      }
      case FEATURE_FLAG.seeding: {
        if (!('id' in viewer)) {
          return false
        }

        if (viewer.role === USER_ROLE.admin) {
          return true
        }

        const seedingUser = await this.baseCount(
          {
            userId: viewer.id,
          },
          'seeding_user'
        )

        return seedingUser > 0
      }
    }
    return false
  }

  /**
   * Get the spam threshold from `feature_flag` table
   * Use to determine whether a article is spam by its spam score
   */
  public getSpamThreshold: () => Promise<number | null> = async () => {
    const cache = new Cache(
      CACHE_PREFIX.SPAM_THRESHOLD,
      this.connections.objectCacheRedis
    )
    const value = (await cache.getObject({
      keys: { id: 'spam_threshold' },
      getter: this._getSpamThreshold,
      expire: isTest ? CACHE_TTL.INSTANT : CACHE_TTL.SHORT,
    })) as number | null
    return value
  }
  private _getSpamThreshold = async (): Promise<number | null> => {
    const threshold = await this.models.findFirst({
      table: 'feature_flag',
      where: { name: FEATURE_NAME.spam_detection, flag: FEATURE_FLAG.on },
    })
    if (!threshold || !threshold.value) {
      return null
    }
    return threshold.value
  }

  /**
   * Get the public discovery spam threshold from `feature_flag` table.
   * Falls back to the global spam threshold so discovery feeds stay compatible
   * when the dedicated flag is missing or off.
   */
  public getDiscoverySpamThreshold = async (): Promise<number | null> => {
    const cache = new Cache(
      CACHE_PREFIX.DISCOVERY_SPAM_THRESHOLD,
      this.connections.objectCacheRedis
    )
    const value = (await cache.getObject({
      keys: { id: 'discovery_spam_threshold' },
      getter: this._getDiscoverySpamThreshold,
      expire: isTest ? CACHE_TTL.INSTANT : CACHE_TTL.SHORT,
    })) as number | null
    return value
  }
  private _getDiscoverySpamThreshold = async (): Promise<number | null> => {
    const threshold = await this.models.findFirst({
      table: 'feature_flag',
      where: {
        name: FEATURE_NAME.discovery_spam_filter,
        flag: FEATURE_FLAG.on,
      },
    })
    if (threshold?.value) {
      return threshold.value
    }
    return this._getSpamThreshold()
  }

  /**
   * Get the topic-channel-only spam threshold from `feature_flag` table.
   */
  public getTopicChannelSpamThreshold = async (): Promise<number | null> => {
    const cache = new Cache(
      CACHE_PREFIX.TOPIC_CHANNEL_SPAM_THRESHOLD,
      this.connections.objectCacheRedis
    )
    const value = (await cache.getObject({
      keys: { id: 'topic_channel_spam_threshold' },
      getter: this._getTopicChannelSpamThreshold,
      expire: isTest ? CACHE_TTL.INSTANT : CACHE_TTL.SHORT,
    })) as number | null
    return value
  }
  private _getTopicChannelSpamThreshold = async (): Promise<number | null> => {
    const threshold = await this.models.findFirst({
      table: 'feature_flag',
      where: {
        name: FEATURE_NAME.topic_channel_spam_filter,
        flag: FEATURE_FLAG.on,
      },
    })
    if (!threshold || !threshold.value) {
      return null
    }
    return threshold.value
  }

  /**
   * Get the discovery probation window (days) from the `discovery_probation`
   * feature flag. Returns `null` when the flag is off or missing, which means
   * discovery feeds behave exactly as before (dark launch, zero diff).
   * `feature_flag.value` overrides the env default when set.
   */
  public getDiscoveryProbationDays = async (): Promise<number | null> => {
    const cache = new Cache(
      CACHE_PREFIX.DISCOVERY_PROBATION_DAYS,
      this.connections.objectCacheRedis
    )
    const value = (await cache.getObject({
      keys: { id: 'discovery_probation_days' },
      getter: this._getDiscoveryProbationDays,
      expire: isTest ? CACHE_TTL.INSTANT : CACHE_TTL.SHORT,
    })) as number | null
    return value
  }
  private _getDiscoveryProbationDays = async (): Promise<number | null> => {
    const featureFlag = await this.models.findFirst({
      table: 'feature_flag',
      where: {
        name: FEATURE_NAME.discovery_probation,
        flag: FEATURE_FLAG.on,
      },
    })
    if (!featureFlag) {
      return null
    }
    return featureFlag.value || environment.discoveryProbationDays
  }

  /**
   * Get the article channel threshold from `feature_flag` table
   * Use to determine whether a article is in a channel by its score
   */
  public getArticleChannelThreshold = async (): Promise<number | null> => {
    const cache = new Cache(
      CACHE_PREFIX.ARTICLE_CHANNEL_THRESHOLD,
      this.connections.objectCacheRedis
    )
    const value = (await cache.getObject({
      keys: { id: 'article_channel_threshold' },
      getter: this._getArticleChannelThreshold,
      expire: isTest ? CACHE_TTL.INSTANT : CACHE_TTL.SHORT,
    })) as number | null
    return value
  }
  private _getArticleChannelThreshold = async (): Promise<number | null> => {
    const threshold = await this.models.findFirst({
      table: 'feature_flag',
      where: { name: FEATURE_NAME.article_channel, flag: FEATURE_FLAG.on },
    })
    if (!threshold || !threshold.value) {
      return null
    }
    return threshold.value
  }

  /*********************************
   *                               *
   *              Asset            *
   *                               *
   *********************************/
  /**
   * Create asset and asset_map
   */
  public createAssetAndAssetMap = async (
    asset: { [key: string]: any },
    entityTypeId: string,
    entityId: string
  ) =>
    this.knex.transaction(async (trx) => {
      const [newAsset] = await trx.insert(asset).into('asset').returning('*')

      await trx
        .insert({
          assetId: newAsset.id,
          entityTypeId,
          entityId,
        })
        .into('asset_map')

      return newAsset
    })

  /**
   * Find asset by a given uuid
   */
  public findAssetByUUID = async (uuid: string): Promise<Asset | null> =>
    this.baseFindByUUID(uuid, 'asset')

  public findAssetByPath = async (path: string) =>
    this.knex('asset').where('path', path).first()

  /**
   * Find or create asset and asset_map record by path
   */
  public findAssetOrCreateByPath = async (
    // path: string,
    data: ItemData,
    entityTypeId: string,
    entityId: string
  ) =>
    this.knex.transaction(async (trx) => {
      // const [newAsset] = await trx.find(asset).into('asset').returning('*')
      const { path, type, authorId, uuid, ...rest } = data
      let asset = await trx('asset')
        .select()
        .where({ path, type, authorId })
        .first()
      let updatedAsset
      if (!asset) {
        ;[asset] = await trx
          .insert({
            ...data,
            uuid: uuid || v4(),
          })
          .into('asset')
          .returning('*')
      } else {
        if (Object.keys(rest).length > 0) {
          // if rest is not empty
          updatedAsset = this.baseUpdate(asset.id, rest, 'asset', trx)
        }
      }

      const assetMData = {
        assetId: asset.id,
        entityTypeId,
        entityId,
      }
      const assetMResultId = await trx('asset_map')
        .select('id')
        .where(assetMData)
        .first()
      if (!assetMResultId) {
        // [assetMResultId] =
        await trx.insert(assetMData).into('asset_map')
      }

      return updatedAsset ?? asset
    })

  /**
   * Find assets by given uuids
   */
  public findAssetByUUIDs = async (uuids: string[]) =>
    this.baseFindByUUIDs(uuids, 'asset')

  /**
   * Gen the url of an asset according asset type.
   */
  public genAssetUrl = (asset: { path: string; type: string }): string => {
    const isImageType = Object.values(IMAGE_ASSET_TYPE).includes(
      asset.type as any
    )
    return isImageType
      ? this.cfsvc.genUrl(asset.path)
      : `${this.aws.getS3Endpoint()}/${asset.path}`
  }
  /**
   * Find the url of an asset by a given id.
   */
  public findAssetUrl = async (id: string): Promise<string | null> => {
    const result = await this.baseFindById<Asset>(id, 'asset')
    return result ? this.genAssetUrl(result) : null
  }

  /**
   * Find asset and asset map by given entity type and id
   */
  public findAssetAndAssetMap = async ({
    entityTypeId,
    entityId,
    assetType,
  }: {
    entityTypeId: string
    entityId: string
    assetType?: keyof typeof ASSET_TYPE
  }) =>
    this.knex('asset_map')
      .select(
        'asset_map.*',
        'uuid',
        'path',
        'type',
        'asset.draft',
        'created_at'
      )
      .rightJoin('asset', 'asset_map.asset_id', 'asset.id')
      .where({ entityTypeId, entityId })
      .modify((builder: Knex.QueryBuilder) => {
        if (assetType) {
          builder.andWhere({ type: assetType })
        }
      })

  /**
   * Swap entity of asset map by given ids
   */
  public swapAssetMapEntity = async (
    assetMapIds: string[],
    entityTypeId: string,
    entityId: string
  ) =>
    this.knex('asset_map').whereIn('id', assetMapIds).update({
      entityTypeId,
      entityId,
    })

  /**
   * Copy entity of asset map by given ids
   *
   * @remarks
   *
   * Delete actual assets carefully after using this method,
   * only delete the actual asset when all other related asset_map record have been removed
   *
   */
  public copyAssetMapEntities = async ({
    source,
    target,
  }: {
    source: { entityTypeId: string; entityId: string }
    target: { entityTypeId: string; entityId: string }
  }) => {
    const maps = await this.knexRO
      .select()
      .from('asset_map')
      .where({ entityTypeId: source.entityTypeId, entityId: source.entityId })

    await Promise.all(
      maps.map((map) =>
        this.models.create({
          table: 'asset_map',
          data: {
            ...map,
            id: undefined,
            entityTypeId: target.entityTypeId,
            entityId: target.entityId,
          },
        })
      )
    )
  }

  /**
   * Delete asset and asset map by the given id:path maps
   */
  public deleteAssetAndAssetMap = async (assetPaths: {
    [id: string]: string
  }) => {
    const ids = Object.keys(assetPaths)
    const paths = Object.keys(assetPaths)

    await this.knex.transaction(async (trx) => {
      await trx('asset_map').whereIn('asset_id', ids).del()
      await trx('asset').whereIn('id', ids).del()
    })

    const logError = (err: Error) => {
      logger.error(err)
    }

    await Promise.allSettled(
      paths
        .map((path) => [
          this.aws.baseDeleteFile(path).catch(logError),
          this.cfsvc.baseDeleteFile(path).catch(logError),
        ])
        .flat()
    )
  }

  /**
   * Find or Delete assets by given author id and types
   */
  public findAssetsByAuthorAndTypes = (authorId: string, types: string[]) =>
    this.knex('asset').whereIn('type', types).andWhere({ authorId })

  public validateArticleCover = async ({
    coverUUID,
    userId,
  }: {
    coverUUID: string
    userId: string
  }) => {
    const asset = await this.findAssetByUUID(coverUUID)
    if (
      !asset ||
      [ASSET_TYPE.embed, ASSET_TYPE.cover].indexOf(asset.type) < 0 ||
      asset.authorId !== userId
    ) {
      throw new AssetNotFoundError('Asset does not exists')
    }
    return asset.id
  }

  /*********************************
   *                               *
   *            Log Record         *
   *                               *
   *********************************/
  public findLogRecord = async (where: { [key: string]: string | boolean }) =>
    this.knex.select().from('log_record').where(where).first()

  public logRecord = async (data: { userId: string; type: string }) =>
    this.baseUpdateOrCreate<LogRecord>({
      where: data,
      data: { readAt: new Date(), ...data },
      table: 'log_record',
    })

  /*********************************
   *                               *
   *           Skipped             *
   *                               *
   *********************************/
  public findSkippedItems = async ({
    types,
    skip,
    take,
  }: {
    types: string[]
    skip?: number
    take?: number
  }) => {
    const query = this.knex('blocklist')
      .whereIn('type', types)
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  public findSkippedItem = async (type: SkippedListItemType, value: string) =>
    this.knex('blocklist').where({ type, value }).first()

  public countSkippedItems = async ({ types }: { types: string[] }) => {
    const result = await this.knex('blocklist')
      .whereIn('type', types)
      .count()
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public createSkippedItem = async ({
    type,
    value,
    uuid,
    note,
    archived,
  }: {
    type: SkippedListItemType
    value: string
    uuid?: string
    note?: string
    archived?: boolean
  }) => {
    const where = { type, value }

    return this.baseUpdateOrCreate<Blocklist>({
      where,
      data: {
        type,
        value,
        note,
        archived,
        uuid: uuid || v4(),
      },
      table: 'blocklist',
    })
  }

  public saveAgentHash = async (value: string, note?: string) => {
    if (!value) {
      return
    }
    return this.createSkippedItem({
      type: SKIPPED_LIST_ITEM_TYPES.AGENT_HASH,
      uuid: v4(),
      value,
      note,
    })
  }

  public updateSkippedItem = async (
    where: Partial<Blocklist>,
    data: Partial<Blocklist>
  ): Promise<Blocklist> => {
    const [updateItem] = await this.knex
      .where(where)
      .update(data)
      .into('blocklist')
      .returning('*')
    return updateItem
  }

  /**
   * Create a report of target.
   *
   * @remarks
   * The target could be an article or a comment.
   * When the target is a comment, collapse the comment base on reports amount and reporters.
   */
  public submitReport = async ({
    targetType,
    targetId,
    reporterId,
    reason,
  }: {
    targetType: ReportType
    targetId: string
    reporterId: string
    reason: ReportReason
  }): Promise<Report> => {
    let report: Report
    let collapsed = false

    if (targetType === NODE_TYPES.Article) {
      const ret = await this.knex('report')
        .insert({
          articleId: targetId,
          reporterId,
          reason,
        })
        .returning('*')
      report = ret[0]
    } else if (targetType === NODE_TYPES.Moment) {
      const ret = await this.knex('report')
        .insert({
          momentId: targetId,
          reporterId,
          reason,
        })
        .returning('*')
      report = ret[0]
    } else {
      const ret = await this.knex('report')
        .insert({
          commentId: targetId,
          reporterId,
          reason,
        })
        .returning('*')

      collapsed = await this.tryCollapseComment(targetId)

      report = ret[0]
    }

    let moderationCase: ModerationCase | null = null
    try {
      moderationCase = await this.syncDirectReportModerationCase({
        targetType,
        targetId,
        reporterId,
        reason,
        reportId: report.id,
        outcome: collapsed ? 'content_collapsed' : null,
      })
    } catch (error) {
      logger.error(error)
    }

    return {
      ...report,
      moderationCaseId: moderationCase?.id ?? null,
      moderationOutcome: collapsed ? 'content_collapsed' : null,
    }
  }

  public markModerationCaseNoticeSent = async ({
    id,
    actorType = 'system',
    actorId,
    publicReason,
    metadata,
  }: {
    id: string
    actorType?: ModerationActorType
    actorId?: string | null
    publicReason?: string | null
    metadata?: Record<string, unknown>
  }): Promise<ModerationCase | null> =>
    this.knex.transaction(async (trx) => {
      const moderationCase = await trx<ModerationCase>('moderation_case')
        .where({ id })
        .forUpdate()
        .first()

      if (!moderationCase) {
        return null
      }

      const [updatedCase] = await trx<ModerationCase>('moderation_case')
        .where({ id })
        .update({
          noticeState: 'sent',
          publicReason:
            publicReason !== undefined
              ? publicReason
              : moderationCase.publicReason,
          updatedAt: trx.fn.now(),
        })
        .returning('*')

      await trx('moderation_event').insert({
        caseId: moderationCase.id,
        eventType: 'notified',
        actorType,
        actorId,
        publicReason: updatedCase.publicReason,
        fromStatus: moderationCase.status,
        toStatus: updatedCase.status,
        fromOutcome: moderationCase.outcome,
        toOutcome: updatedCase.outcome,
        metadata: {
          noticeState: updatedCase.noticeState,
          ...(metadata ?? {}),
        },
      })

      return updatedCase
    })

  public updateModerationCase = async ({
    id,
    actorId,
    status,
    outcome,
    noticeState,
    publicReason,
    internalNote,
  }: {
    id: string
    actorId: string
    status?: ModerationCaseStatus | null
    outcome?: ModerationCaseOutcome | null
    noticeState?: ModerationNoticeState | null
    publicReason?: string | null
    internalNote?: string | null
  }): Promise<ModerationCase> => {
    const hasCasePatch =
      !!status ||
      outcome !== undefined ||
      !!noticeState ||
      publicReason !== undefined
    const hasEventOnlyPatch = !!internalNote

    if (!hasCasePatch && !hasEventOnlyPatch) {
      throw new UserInputError('no moderation case update provided')
    }

    return this.knex.transaction(async (trx) => {
      const moderationCase = await trx<ModerationCase>('moderation_case')
        .where({ id })
        .forUpdate()
        .first()

      if (!moderationCase) {
        throw new UserInputError('moderation case not found')
      }

      const patch: Record<string, unknown> = {
        updatedAt: trx.fn.now(),
      }
      if (status) {
        patch.status = status
        if (status === 'resolved' && !moderationCase.resolvedAt) {
          patch.resolvedAt = trx.fn.now()
        }
        if (status === 'closed' && !moderationCase.closedAt) {
          patch.closedAt = trx.fn.now()
        }
      }
      if (outcome !== undefined) {
        patch.outcome = outcome
      }
      if (noticeState) {
        patch.noticeState = noticeState
      }
      if (publicReason !== undefined) {
        patch.publicReason = publicReason
      }

      const [updatedCase] = await trx<ModerationCase>('moderation_case')
        .where({ id: moderationCase.id })
        .update(patch)
        .returning('*')

      const eventType: ModerationEventType =
        updatedCase.status === 'closed'
          ? 'closed'
          : updatedCase.status === 'appealed'
          ? 'appealed'
          : updatedCase.outcome === 'restored'
          ? 'restored'
          : updatedCase.status === 'action_taken'
          ? 'actioned'
          : 'reviewed'

      await trx('moderation_event').insert({
        caseId: moderationCase.id,
        eventType,
        actorType: 'admin',
        actorId,
        publicReason: updatedCase.publicReason,
        internalNote: internalNote || null,
        fromStatus: moderationCase.status,
        toStatus: updatedCase.status,
        fromOutcome: moderationCase.outcome,
        toOutcome: updatedCase.outcome,
        metadata: {
          noticeState: updatedCase.noticeState,
          source: updatedCase.source,
          targetType: updatedCase.targetType,
        },
      })

      return updatedCase
    })
  }

  /**
   * Record an account-level enforcement (freeze) as a moderation case so it
   * enters transparency metrics. Re-freezing with the same source/reason
   * reuses the case (unique on source/targetType/targetId/reason).
   */
  public recordAccountRestrictionCase = async ({
    userId,
    reason,
    source,
    automationRole = 'none',
    actorId,
    noticeSent = false,
    metadata,
  }: {
    userId: string
    reason: string
    source: ModerationCaseSource
    automationRole?: ModerationAutomationRole
    actorId?: string | null
    noticeSent?: boolean
    metadata?: Record<string, unknown>
  }): Promise<ModerationCase> => {
    const { moderationCase, created } = await this.findOrCreateModerationCase({
      source,
      targetType: 'user',
      targetId: userId,
      reason,
      automationRole,
    })

    if (created) {
      await this.createModerationEvent({
        caseId: moderationCase.id,
        eventType: 'created',
        actorType: actorId ? 'admin' : 'system',
        actorId,
        toStatus: 'received',
        metadata: metadata ?? null,
      })
    }

    const [updatedCase] = await this.knex<ModerationCase>('moderation_case')
      .where({ id: moderationCase.id })
      .update({
        status: 'action_taken',
        outcome: 'account_limited',
        ...(noticeSent ? { noticeState: 'sent' } : {}),
        updatedAt: this.knex.fn.now(),
      })
      .returning('*')

    await this.createModerationEvent({
      caseId: moderationCase.id,
      eventType: 'actioned',
      actorType: actorId ? 'admin' : 'system',
      actorId,
      publicReason: reason,
      fromStatus: moderationCase.status,
      toStatus: 'action_taken',
      fromOutcome: moderationCase.outcome,
      toOutcome: 'account_limited',
      metadata: metadata ?? null,
    })

    return updatedCase
  }

  /**
   * Resolve the open account-restriction case when the account is unfrozen
   * (appeal accepted or staff reversal). No-op when no open case exists,
   * e.g. freezes that predate case recording.
   */
  public resolveAccountRestrictionCase = async ({
    userId,
    actorId,
    metadata,
  }: {
    userId: string
    actorId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<ModerationCase | null> => {
    const moderationCase = await this.knex<ModerationCase>('moderation_case')
      .where({
        targetType: 'user',
        targetId: userId,
        outcome: 'account_limited',
      })
      .whereNull('resolvedAt')
      .orderBy('id', 'desc')
      .first()

    if (!moderationCase) {
      return null
    }

    const [updatedCase] = await this.knex<ModerationCase>('moderation_case')
      .where({ id: moderationCase.id })
      .update({
        status: 'resolved',
        outcome: 'restored',
        resolvedAt: this.knex.fn.now(),
        updatedAt: this.knex.fn.now(),
      })
      .returning('*')

    await this.createModerationEvent({
      caseId: moderationCase.id,
      eventType: 'restored',
      actorType: actorId ? 'admin' : 'system',
      actorId,
      fromStatus: moderationCase.status,
      toStatus: 'resolved',
      fromOutcome: moderationCase.outcome,
      toOutcome: 'restored',
      metadata: metadata ?? null,
    })

    return updatedCase
  }

  private toModerationTargetType = (
    targetType: ReportType
  ): ModerationTargetType => {
    if (targetType === NODE_TYPES.Article) {
      return 'article'
    }
    if (targetType === NODE_TYPES.Moment) {
      return 'moment'
    }
    return 'comment'
  }

  private createModerationEvent = async ({
    caseId,
    eventType,
    actorType,
    actorId,
    publicReason,
    internalNote,
    fromStatus,
    toStatus,
    fromOutcome,
    toOutcome,
    metadata,
  }: {
    caseId: string
    eventType: ModerationEventType
    actorType: ModerationActorType
    actorId?: string | null
    publicReason?: string | null
    internalNote?: string | null
    fromStatus?: ModerationCaseStatus | null
    toStatus?: ModerationCaseStatus | null
    fromOutcome?: ModerationCaseOutcome | null
    toOutcome?: ModerationCaseOutcome | null
    metadata?: Record<string, unknown> | null
  }) =>
    this.knex('moderation_event').insert({
      caseId,
      eventType,
      actorType,
      actorId,
      publicReason,
      internalNote,
      fromStatus,
      toStatus,
      fromOutcome,
      toOutcome,
      metadata,
    })

  private findOrCreateModerationCase = async ({
    source,
    targetType,
    targetId,
    reporterId,
    reason,
    automationRole = 'none',
  }: {
    source: ModerationCaseSource
    targetType: ModerationTargetType
    targetId: string
    reporterId?: string | null
    reason: string
    automationRole?: ModerationAutomationRole
  }): Promise<{ moderationCase: ModerationCase; created: boolean }> => {
    const base = {
      source,
      targetType,
      targetId,
      reason,
    }
    const [inserted] = await this.knex('moderation_case')
      .insert({
        ...base,
        primaryReporterId: reporterId,
        automationRole,
      })
      .onConflict(['source', 'targetType', 'targetId', 'reason'])
      .ignore()
      .returning('*')

    if (inserted) {
      return { moderationCase: inserted, created: true }
    }

    const moderationCase = await this.knex<ModerationCase>('moderation_case')
      .where(base)
      .first()

    if (!moderationCase) {
      throw new Error('failed to create or load moderation case')
    }

    await this.knex('moderation_case')
      .where({ id: moderationCase.id })
      .update({ updatedAt: this.knex.fn.now() })

    return { moderationCase, created: false }
  }

  private syncDirectReportModerationCase = async ({
    targetType,
    targetId,
    reporterId,
    reason,
    reportId,
    outcome,
  }: {
    targetType: ReportType
    targetId: string
    reporterId: string
    reason: ReportReason
    reportId: string
    outcome: ModerationCaseOutcome | null
  }): Promise<ModerationCase> => {
    const { moderationCase, created } = await this.findOrCreateModerationCase({
      source: 'direct_report',
      targetType: this.toModerationTargetType(targetType),
      targetId,
      reporterId,
      reason,
    })

    await this.knex('moderation_case_reporter')
      .insert({
        caseId: moderationCase.id,
        reporterId,
        reportId,
      })
      .onConflict(['caseId', 'reporterId'])
      .ignore()

    if (created) {
      await this.createModerationEvent({
        caseId: moderationCase.id,
        eventType: 'created',
        actorType: 'user',
        actorId: reporterId,
        toStatus: 'received',
        metadata: {
          reportId,
          targetType: this.toModerationTargetType(targetType),
        },
      })
    }

    if (outcome) {
      const [updatedCase] = await this.knex<ModerationCase>('moderation_case')
        .where({ id: moderationCase.id })
        .update({
          status: 'action_taken',
          outcome,
          resolvedAt: this.knex.fn.now(),
          updatedAt: this.knex.fn.now(),
        })
        .returning('*')

      await this.createModerationEvent({
        caseId: moderationCase.id,
        eventType: 'actioned',
        actorType: 'system',
        fromStatus: moderationCase.status,
        toStatus: 'action_taken',
        fromOutcome: moderationCase.outcome,
        toOutcome: outcome,
        publicReason: reason,
        metadata: { reportId },
      })

      return updatedCase
    }

    return moderationCase
  }

  /**
   * Collapse the article comment if its reports are created by more than 3 different users or 1 article author
   *
   * @returns true if the comment is collapsed, otherwise false
   *
   */
  private tryCollapseComment = async (commentId: string): Promise<boolean> => {
    const comment = await this.models.findUnique({
      table: 'comment',
      where: { id: commentId },
    })

    if (
      !comment ||
      comment.state === COMMENT_STATE.collapsed ||
      comment.type !== COMMENT_TYPE.article
    ) {
      return false
    }

    const reports = await this.knex<Report>('report')
      .select(['id', 'reporterId'])
      .distinctOn('reporterId')
      .where({ commentId })

    if (reports.length >= 3) {
      await this.models.update({
        table: 'comment',
        where: { id: commentId },
        data: { state: COMMENT_STATE.collapsed },
      })
      await invalidateFQC({
        node: { id: commentId, type: NODE_TYPES.Comment },
        redis: this.redis,
      })
      return true
    }

    const { authorId } = await this.models.findUnique({
      table: 'article',
      where: { id: comment.targetId },
    })

    if (authorId && reports.find((r) => r.reporterId === authorId)) {
      await this.models.update({
        table: 'comment',
        where: { id: commentId },
        data: { state: COMMENT_STATE.collapsed },
      })
      await invalidateFQC({
        node: { id: commentId, type: NODE_TYPES.Comment },
        redis: this.redis,
      })
      return true
    }

    return false
  }

  public findAnnouncement = async ({
    id,
    visible,
  }: {
    id: string
    visible?: boolean
  }) => {
    const records = await this.models.findMany({
      table: 'announcement',
      where: {
        id,
        ...(visible !== undefined ? { visible } : {}),
      },
      modifier: (builder: Knex.QueryBuilder) => {
        builder.whereRaw(
          `(expired_at IS NULL OR expired_at >= CURRENT_TIMESTAMP)`
        )
      },
      orderBy: [{ column: 'createdAt', order: 'desc' }],
    })
    return records[0] ?? null
  }

  public findAnnouncements = async ({
    channelId,
    visible,
  }: {
    channelId?: string
    visible?: boolean
  }) => {
    if (channelId) {
      return this.knexRO('channel_announcement')
        .leftJoin(
          'announcement',
          'channel_announcement.announcementId',
          'announcement.id'
        )
        .where({
          channelId,
        })
        .where((builder) => {
          if (visible !== undefined) {
            builder.where('channel_announcement.visible', visible)
          }
        })
        .select('announcement.*')
        .orderBy('channel_announcement.createdAt', 'desc')
    }
    return this.models.findMany({
      table: 'announcement',
      where: {
        ...(visible !== undefined ? { visible } : {}),
      },
      modifier: (builder: Knex.QueryBuilder) => {
        builder.whereRaw(
          `(expired_at IS NULL OR expired_at >= CURRENT_TIMESTAMP)`
        )
      },
      orderBy: [{ column: 'createdAt', order: 'desc' }],
    })
  }
}
