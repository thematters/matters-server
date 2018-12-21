import DataLoader from 'dataloader'
import { BaseService } from './baseService'

export class SystemService extends BaseService {
  constructor() {
    super('noop')
  }

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
}
