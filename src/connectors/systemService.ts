import { BaseService } from './baseService'
import logger from 'common/logger'

export class SystemService extends BaseService {
  constructor() {
    super('noop')
  }

  frequentSearch = async ({
    key = '',
    limit = 5
  }: {
    key?: string
    limit?: number
  }) => {
    const result = await this.knex('search_history')
      .select('search_key')
      .count('id')
      .where('search_key', 'like', `%${key}%`)
      .groupBy('search_key')
      .orderBy('count', 'desc')
      .limit(limit)

    return result.map(({ searchKey }: { searchKey: string }) => searchKey)
  }

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
    const { path } = await this.baseFindById(id, 'asset')
    return path ? `${this.aws.s3Endpoint}/${path}` : null
  }

  /**
   * Find assets by a given author id (user).
   */
  findAssetsByAuthorId = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('asset')
      .where({ authorId })

  /**
   * Find assets by a given author id (user) and type.
   */
  findAssetsByAuthorIdAndType = async (
    authorId: string,
    type: string
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('asset')
      .where({ authorId, type })

  /**
   * User submit a feeback
   */
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
}
