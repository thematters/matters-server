import { BaseService } from './baseService'

export class SystemService extends BaseService {
  constructor() {
    super('noop')
  }

  /**
   * Find asset by a given uuid
   */
  findAssetByUUID = async (uuid: string) => this.baseFindByUUID(uuid, 'asset')

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
  feedback = async (
    userId: string,
    category: string,
    description: string,
    contact: string,
    assetIds: string[]
  ): Promise<void> => {
    // create feedback
    const { id: reportId } = await this.baseCreate(
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
      reportId,
      assetId
    }))
    await this.baseBatchCreate(reportAssets, 'feedback_asset')
  }
}
