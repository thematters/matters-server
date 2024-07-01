import type {
  ItemData,
  SkippedListItemType,
  Viewer,
  Connections,
  ReportType,
  ReportReason,
  Report,
  Asset,
  BaseDBSchema,
  LogRecord,
  Blocklist,
} from 'definitions'
import type { Knex } from 'knex'

import { invalidateFQC } from '@matters/apollo-response-cache'
import { v4 } from 'uuid'

import {
  ASSET_TYPE,
  IMAGE_ASSET_TYPE,
  SEARCH_KEY_TRUNCATE_LENGTH,
  SKIPPED_LIST_ITEM_TYPES,
  USER_ROLE,
  FEATURE_NAME,
  FEATURE_FLAG,
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
} from 'common/enums'
import { getLogger } from 'common/logger'
import { BaseService } from 'connectors'

const logger = getLogger('service-system')

export class SystemService extends BaseService<BaseDBSchema> {
  private featureFlagTable: string

  public constructor(connections: Connections) {
    // @ts-ignore
    super('noop', connections)

    this.featureFlagTable = 'feature_flag'
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  public frequentSearch = async ({
    key = '',
    first = 5,
  }: {
    key?: string
    first?: number
  }) => {
    const query = this.knexRO('search_history')
      .select('search_key')
      .count('id')
      .whereNot({ searchKey: '' })
      .whereNotIn(
        'searchKey',
        this.knexRO.from('blocked_search_keyword').select('searchKey')
      )
      .groupBy('search_key')
      .orderBy('count', 'desc')
      .limit(first)

    if (key) {
      query.where('search_key', 'like', `%${key}%`)
    } else {
      query.where(
        'created_at',
        '>=',
        this.knexRO.raw(`now() -  interval '1 days'`)
      )
    }

    const result = await query

    return result.map(({ searchKey }) =>
      (searchKey as string).slice(0, SEARCH_KEY_TRUNCATE_LENGTH)
    )
  }

  /*********************************
   *                               *
   *            Features           *
   *                               *
   *********************************/

  public getFeatureFlags = () =>
    this.knex(this.featureFlagTable).select('*').limit(50)

  public getFeatureFlag = async (name: keyof typeof FEATURE_NAME) => {
    const [featureFlag] = await this.knex(this.featureFlagTable).where({ name })
    return featureFlag
  }

  public setFeatureFlag = async ({
    name,
    flag,
  }: {
    name: keyof typeof FEATURE_NAME
    flag: keyof typeof FEATURE_FLAG
  }) => {
    const [featureFlag] = await this.knex
      .where({ name })
      .update({
        name,
        flag,
        updatedAt: this.knex.fn.now(),
      })
      .into(this.featureFlagTable)
      .returning('*')
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
      : `${this.aws.s3Endpoint}/${asset.path}`
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
    const maps = await this.knex
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
    if (targetType === NODE_TYPES.Article) {
      const ret = await this.knex('report')
        .insert({
          articleId: targetId,
          reporterId,
          reason,
        })
        .returning('*')
      return ret[0]
    } else if (targetType === NODE_TYPES.Moment) {
      const ret = await this.knex('report')
        .insert({
          momentId: targetId,
          reporterId,
          reason,
        })
        .returning('*')
      return ret[0]
    } else {
      const ret = await this.knex('report')
        .insert({
          commentId: targetId,
          reporterId,
          reason,
        })
        .returning('*')

      await this.tryCollapseComment(targetId)

      return ret[0]
    }
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
}
