import { BaseService } from './baseService'
import logger from 'common/logger'
import { BATCH_SIZE } from 'common/enums'

export class SystemService extends BaseService {
  constructor() {
    super('noop')
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  frequentSearch = async ({
    key = '',
    first = 5
  }: {
    key?: string
    first?: number
  }) => {
    const result = await this.knex('search_history')
      .select('search_key')
      .count('id')
      .where('search_key', 'like', `%${key}%`)
      .whereNot({ searchKey: '' })
      .groupBy('search_key')
      .orderBy('count', 'desc')
      .limit(first)

    return result.map(({ searchKey }: { searchKey: string }) => searchKey)
  }

  /*********************************
   *                               *
   *              Asset            *
   *                               *
   *********************************/
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
    return assets.map(
      ({ path }: { path: string }) =>
        path ? `${this.aws.s3Endpoint}/${path}` : null
    )
  }

  /*********************************
   *                               *
   *             Report            *
   *                               *
   *********************************/
  findReportById = async (reportId: string) =>
    this.knex('report')
      .select()
      .where({ id: reportId })
      .first()

  findReports = async ({
    comment,
    article,
    offset = 0,
    limit = BATCH_SIZE
  }: {
    comment: boolean
    article: boolean
    offset?: number
    limit?: number
  }) => {
    let qs = this.knex('report')
      .select()
      .orderBy('id', 'desc')

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
    article
  }: {
    comment: boolean
    article: boolean
  }) => {
    let qs = this.knex('report')
      .count()
      .first()

    if (comment) {
      qs = qs.whereNotNull('comment_id')
    }
    if (article) {
      qs = qs.orWhereNotNull('article_id')
    }

    const result = await qs
    return parseInt(result.count, 10)
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
    assetIds
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
        contact
      },
      'feedback'
    )
    // create feedback assets
    if (!assetIds || assetIds.length <= 0) {
      return
    }
    const reportAssets = assetIds.map(assetId => ({
      feedbackId,
      assetId
    }))
    await this.baseBatchCreate(reportAssets, 'feedback_asset')
  }

  /*********************************
   *                               *
   *             Feedback          *
   *                               *
   *********************************/
}
