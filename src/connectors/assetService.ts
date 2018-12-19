import { BaseService } from './baseService'
import { BATCH_SIZE } from 'common/enums'
import DataLoader from 'dataloader'

export class AssetService extends BaseService {
  constructor() {
    super('asset')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Find assets by a given author id (user).
   */
  findByAuthorId = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })

  /**
   * Find audio draft by a given author id (user) and type.
   */
  findByAuthorIdAndType = async (authorId: string, type: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId, type })

}
