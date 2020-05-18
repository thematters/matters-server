import { v4 } from 'uuid'

import {
  BATCH_SIZE,
  SEARCH_KEY_TRUNCATE_LENGTH,
  SKIPPED_LIST_ITEM_TYPES,
} from 'common/enums'
import logger from 'common/logger'
import { BaseService } from 'connectors'
import { GQLFeatureName, SkippedListItemType } from 'definitions'

export class SystemService extends BaseService {
  featureFlagTable: string

  constructor() {
    super('noop')

    this.featureFlagTable = 'feature_flag'
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  frequentSearch = async ({
    key = '',
    first = 5,
  }: {
    key?: string
    first?: number
  }) => {
    const query = this.knex('search_history')
      .select('search_key')
      .count('id')
      .whereNot({ searchKey: '' })
      .groupBy('search_key')
      .orderBy('count', 'desc')
      .limit(first)

    if (key) {
      query.where('search_key', 'like', `%${key}%`)
    } else {
      query.where(
        'created_at',
        '>=',
        this.knex.raw(`now() -  interval '14 days'`)
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

  getFeatureFlags = () => this.knex(this.featureFlagTable).select('*').limit(50)

  getFeatureFlag = async (
    name: GQLFeatureName | keyof typeof GQLFeatureName
  ) => {
    const [featureFlag] = await this.knex(this.featureFlagTable).where({ name })
    return featureFlag
  }

  toggleFeature = async (
    name: GQLFeatureName | keyof typeof GQLFeatureName
  ) => {
    const oldFeatureFlag = await this.getFeatureFlag(name)

    const [featureFlag] = await this.knex
      .where({ name })
      .update({
        name,
        enabled: !oldFeatureFlag.enabled,
        updatedAt: this.knex.fn.now(),
      })
      .into(this.featureFlagTable)
      .returning('*')
    return featureFlag
  }

  /*********************************
   *                               *
   *              Asset            *
   *                               *
   *********************************/
  /**
   * Create asset and asset_map
   */
  createAssetAndAssetMap = async (
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
  findAssetByUUID = async (uuid: string) => this.baseFindByUUID(uuid, 'asset')

  /**
   * Find assets by given uuids
   */
  findAssetByUUIDs = async (uuids: string[]) =>
    this.baseFindByUUIDs(uuids, 'asset')

  /**
   * Find the url of an asset by a given id.
   */
  findAssetUrl = async (id: string): Promise<string | null> => {
    const result = await this.baseFindById(id, 'asset')
    return result && result.path
      ? `${this.aws.s3Endpoint}/${result.path}`
      : null
  }

  /**
   * Find assets by a given report id
   */
  findAssetsByReportId = async (reportId: string) => {
    const reportAssets = await this.knex('report_asset')
      .select()
      .where({ reportId })
    const assets = await this.baseFindByIds(
      reportAssets.map(({ assetId }: { assetId: string }) => assetId),
      'asset'
    )
    return assets.map(({ path }: { path: string }) =>
      path ? `${this.aws.s3Endpoint}/${path}` : null
    )
  }

  /**
   * Find asset map by given entity type and id
   */
  findAssetMap = async (entityTypeId: string, entityId: string) =>
    this.knex('asset_map')
      .select('asset_id', 'uuid', 'path', 'entityId')
      .where({ entityTypeId, entityId })
      .rightJoin('asset', 'asset_map.asset_id', 'asset.id')

  /**
   * Update asset map by given entity type and id
   */
  replaceAssetMapEntityTypeAndId = async (
    oldEntityTypeId: string,
    oldEntityId: string,
    newEntityTypeId: string,
    newEntityId: string
  ) =>
    this.knex('asset_map')
      .where({
        entityTypeId: oldEntityTypeId,
        entityId: oldEntityId,
      })
      .update({
        entityTypeId: newEntityTypeId,
        entityId: newEntityId,
      })

  /**
   * Delete asset and asset map by a given id
   */
  deleteAssetAndAssetMap = async (assets: Array<{ [key: string]: string }>) => {
    const ids = Object.keys(assets)

    await this.knex.transaction(async (trx) => {
      await trx('asset_map').whereIn('asset_id', ids).del()

      await trx('asset').whereIn('id', ids).del()
    })

    try {
      await Promise.all(
        Object.values(assets).map((key: any) => {
          this.aws.baseDeleteFile(key)
        })
      )
    } catch (e) {
      logger.error(e)
    }
  }

  /**
   * Find or Delete assets by given author id and types
   */
  findAssetsByAuthorAndTypes = (authorId: string, types: string[]) =>
    this.knex('asset').whereIn('type', types).andWhere({ authorId })

  /*********************************
   *                               *
   *             Report            *
   *                               *
   *********************************/
  findReportById = async (reportId: string) =>
    this.knex('report').select().where({ id: reportId }).first()

  findReports = async ({
    comment,
    article,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    comment: boolean
    article: boolean
    offset?: number
    limit?: number
  }) => {
    let qs = this.knex('report').select().orderBy('id', 'desc')

    if (comment) {
      qs = qs.whereNotNull('comment_id')
    }
    if (article) {
      qs = qs.orWhereNotNull('article_id')
    }
    if (offset) {
      qs = qs.offset(offset)
    }
    if (limit) {
      qs = qs.limit(limit)
    }

    return qs
  }

  countReports = async ({
    comment,
    article,
  }: {
    comment: boolean
    article: boolean
  }) => {
    let qs = this.knex('report').count().first()

    if (comment) {
      qs = qs.whereNotNull('comment_id')
    }
    if (article) {
      qs = qs.orWhereNotNull('article_id')
    }

    const result = await qs
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *             Feedback          *
   *                               *
   *********************************/
  feedback = async ({
    userId,
    category,
    description,
    contact,
    assetIds,
  }: {
    userId?: string | null
    category: string
    description?: string
    contact?: string
    assetIds?: string[]
  }): Promise<void> => {
    // create feedback
    const { id: feedbackId } = await this.baseCreate(
      {
        userId,
        category,
        description,
        contact,
      },
      'feedback'
    )
    // create feedback assets
    if (!assetIds || assetIds.length <= 0) {
      return
    }
    const reportAssets = assetIds.map((assetId) => ({
      feedbackId,
      assetId,
    }))
    await this.baseBatchCreate(reportAssets, 'feedback_asset')
  }

  /*********************************
   *                               *
   *            Log Record         *
   *                               *
   *********************************/
  findLogRecord = async (where: { [key: string]: string | boolean }) =>
    this.knex.select().from('log_record').where(where).first()

  logRecord = async (data: { userId: string; type: string }) => {
    return this.baseUpdateOrCreate({
      where: data,
      data: { readAt: new Date(), ...data },
      table: 'log_record',
    })
  }

  /*********************************
   *                               *
   *           Skipped             *
   *                               *
   *********************************/
  findSkippedItem = async (type: SkippedListItemType, value: string) => {
    return this.knex('blocklist').where({ type, value }).first()
  }

  createSkippedItem = async (
    type: SkippedListItemType,
    uuid: string,
    value: string,
    note?: string
  ) => {
    if (!type || !uuid || !value) {
      return
    }
    const item = await this.findSkippedItem(type, value)
    if (!item) {
      const data = {
        uuid,
        type,
        value,
        ...(note ? { note } : {}),
      }
      return this.baseCreate(data, 'blocklist')
    }
  }

  saveAgentHash = async (value: string, note?: string) => {
    if (!value) {
      return
    }
    return this.createSkippedItem(
      SKIPPED_LIST_ITEM_TYPES.AGENT_HASH,
      v4(),
      value,
      note
    )
  }

  updateSkippedItem = async (
    where: Record<string, any>,
    data: Record<string, any>
  ) => {
    const [updateItem] = await this.knex
      .where(where)
      .update(data)
      .into('blocklist')
      .returning('*')
    return updateItem
  }
}
