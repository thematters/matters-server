import DataLoader from 'dataloader'
import { BaseService } from './baseService'

export class SystemService extends BaseService {
  constructor() {
    super('noop')
  }

  /**
   * Find assets by a given author id (user).
   */
  findByAuthorId = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('asset')
      .where({ authorId })

  /**
   * Find assets by a given author id (user) and type.
   */
  findByAuthorIdAndType = async (
    authorId: string,
    type: string
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('asset')
      .where({ authorId, type })
}
